// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

package crunchrun

import (
	"crypto/rand"
	"crypto/rsa"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"syscall"

	"git.arvados.org/arvados.git/sdk/go/httpserver"
	"github.com/creack/pty"
	"github.com/google/shlex"
	"golang.org/x/crypto/ssh"
)

// startGatewayServer starts an http server that allows authenticated
// clients to open an interactive "docker exec" session and (in
// future) connect to tcp ports inside the docker container.
func (runner *ContainerRunner) startGatewayServer() error {
	runner.gatewaySSHConfig = &ssh.ServerConfig{
		NoClientAuth: true,
		PasswordCallback: func(c ssh.ConnMetadata, pass []byte) (*ssh.Permissions, error) {
			if c.User() == "root" {
				return nil, nil
			} else {
				return nil, fmt.Errorf("unimplemented: cannot log in as non-root user %q", c.User())
			}
		},
		PublicKeyCallback: func(c ssh.ConnMetadata, pubKey ssh.PublicKey) (*ssh.Permissions, error) {
			if c.User() == "root" {
				return &ssh.Permissions{
					Extensions: map[string]string{
						"pubkey-fp": ssh.FingerprintSHA256(pubKey),
					},
				}, nil
			} else {
				return nil, fmt.Errorf("unimplemented: cannot log in as non-root user %q", c.User())
			}
		},
	}
	pvt, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		return err
	}
	err = pvt.Validate()
	if err != nil {
		return err
	}
	signer, err := ssh.NewSignerFromKey(pvt)
	if err != nil {
		return err
	}
	runner.gatewaySSHConfig.AddHostKey(signer)

	// GatewayAddress (provided by arvados-dispatch-cloud) is
	// HOST:PORT where HOST is our IP address or hostname as seen
	// from arvados-controller, and PORT is either the desired
	// port where we should run our gateway server, or "0" if
	// we should choose an available port.
	host, port, err := net.SplitHostPort(os.Getenv("GatewayAddress"))
	if err != nil {
		return err
	}
	srv := &httpserver.Server{
		Server: http.Server{
			Handler: http.HandlerFunc(runner.handleSSH),
		},
		Addr: ":" + port,
	}
	err = srv.Start()
	if err != nil {
		return err
	}
	// Get the port number we are listening on (the port might be
	// "0" or a port name, in which case this will be different).
	_, port, err = net.SplitHostPort(srv.Addr)
	if err != nil {
		return err
	}
	// When changing state to Running, we will set
	// gateway_address to "HOST:PORT" where HOST is our
	// external hostname/IP as provided by arvados-dispatch-cloud,
	// and PORT is the port number we ended up listening on.
	runner.gatewayAddress = net.JoinHostPort(host, port)
	return nil
}

// handleSSH connects to an SSH server that runs commands as root in
// the container. The tunnel itself can only be created by an
// authenticated caller, so the SSH server itself is wide open (any
// password or key will be accepted).
//
// Requests must have path "/ssh" and the following headers:
//
// Connection: upgrade
// Upgrade: ssh
// X-Arvados-Target-Uuid: uuid of container
// X-Arvados-Authorization: must match GatewayAuthSecret provided by
// a-d-c (this prevents other containers and shell nodes from
// connecting directly)
//
// Optional header:
//
// X-Arvados-Detach-Keys: argument to "docker attach --detach-keys",
// e.g., "ctrl-p,ctrl-q"
func (runner *ContainerRunner) handleSSH(w http.ResponseWriter, req *http.Request) {
	// In future we'll handle browser traffic too, but for now the
	// only traffic we expect is an SSH tunnel from
	// (*lib/controller/localdb.Conn)ContainerSSH()
	if req.Method != "GET" || req.Header.Get("Upgrade") != "ssh" {
		http.Error(w, "path not found", http.StatusNotFound)
		return
	}
	if want := req.Header.Get("X-Arvados-Target-Uuid"); want != runner.Container.UUID {
		http.Error(w, fmt.Sprintf("misdirected request: meant for %q but received by crunch-run %q", want, runner.Container.UUID), http.StatusBadGateway)
		return
	}
	if req.Header.Get("X-Arvados-Authorization") != runner.gatewayAuthSecret {
		http.Error(w, "bad X-Arvados-Authorization header", http.StatusUnauthorized)
		return
	}
	detachKeys := req.Header.Get("X-Arvados-Detach-Keys")
	hj, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "ResponseWriter does not support connection upgrade", http.StatusInternalServerError)
		return
	}
	netconn, _, err := hj.Hijack()
	if !ok {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer netconn.Close()
	w.Header().Set("Connection", "upgrade")
	w.Header().Set("Upgrade", "ssh")
	netconn.Write([]byte("HTTP/1.1 101 Switching Protocols\r\n"))
	w.Header().Write(netconn)
	netconn.Write([]byte("\r\n"))

	ctx := req.Context()

	conn, newchans, reqs, err := ssh.NewServerConn(netconn, runner.gatewaySSHConfig)
	if err != nil {
		runner.CrunchLog.Printf("ssh.NewServerConn: %s", err)
		return
	}
	defer conn.Close()
	go ssh.DiscardRequests(reqs)
	for newch := range newchans {
		if newch.ChannelType() != "session" {
			newch.Reject(ssh.UnknownChannelType, "unknown channel type")
			continue
		}
		ch, reqs, err := newch.Accept()
		if err != nil {
			runner.CrunchLog.Printf("accept channel: %s", err)
			return
		}
		var pty0, tty0 *os.File
		go func() {
			defer pty0.Close()
			defer tty0.Close()
			// Where to send errors/messages for the
			// client to see
			logw := io.Writer(ch.Stderr())
			// How to end lines when sending
			// errors/messages to the client (changes to
			// \r\n when using a pty)
			eol := "\n"
			// Env vars to add to child process
			termEnv := []string(nil)
			for req := range reqs {
				ok := false
				switch req.Type {
				case "shell", "exec":
					ok = true
					var payload struct {
						Command string
					}
					ssh.Unmarshal(req.Payload, &payload)
					execargs, err := shlex.Split(payload.Command)
					if err != nil {
						fmt.Fprintf(logw, "error parsing supplied command: %s"+eol, err)
						return
					}
					if len(execargs) == 0 {
						execargs = []string{"/bin/bash", "-login"}
					}
					go func() {
						cmd := exec.CommandContext(ctx, "docker", "exec", "-i", "--detach-keys="+detachKeys)
						cmd.Stdin = ch
						cmd.Stdout = ch
						cmd.Stderr = ch.Stderr()
						if tty0 != nil {
							cmd.Args = append(cmd.Args, "-t")
							cmd.Stdin = tty0
							cmd.Stdout = tty0
							cmd.Stderr = tty0
							var wg sync.WaitGroup
							defer wg.Wait()
							wg.Add(2)
							go func() { io.Copy(ch, pty0); wg.Done() }()
							go func() { io.Copy(pty0, ch); wg.Done() }()
							// Send our own debug messages to tty as well.
							logw = tty0
						}
						cmd.Args = append(cmd.Args, runner.ContainerID)
						cmd.Args = append(cmd.Args, execargs...)
						cmd.SysProcAttr = &syscall.SysProcAttr{
							Setctty: tty0 != nil,
							Setsid:  true,
						}
						cmd.Env = append(os.Environ(), termEnv...)
						err := cmd.Run()
						errClose := ch.CloseWrite()
						var resp struct {
							Status uint32
						}
						if err, ok := err.(*exec.ExitError); ok {
							if status, ok := err.Sys().(syscall.WaitStatus); ok {
								resp.Status = uint32(status.ExitStatus())
							}
						}
						if resp.Status == 0 && (err != nil || errClose != nil) {
							resp.Status = 1
						}
						ch.SendRequest("exit-status", false, ssh.Marshal(&resp))
						ch.Close()
					}()
				case "pty-req":
					eol = "\r\n"
					p, t, err := pty.Open()
					if err != nil {
						fmt.Fprintf(ch.Stderr(), "pty failed: %s"+eol, err)
						break
					}
					pty0, tty0 = p, t
					ok = true
					var payload struct {
						Term string
						Cols uint32
						Rows uint32
						X    uint32
						Y    uint32
					}
					ssh.Unmarshal(req.Payload, &payload)
					termEnv = []string{"TERM=" + payload.Term, "USE_TTY=1"}
					err = pty.Setsize(pty0, &pty.Winsize{Rows: uint16(payload.Rows), Cols: uint16(payload.Cols), X: uint16(payload.X), Y: uint16(payload.Y)})
					if err != nil {
						fmt.Fprintf(logw, "pty-req: setsize failed: %s"+eol, err)
					}
				case "window-change":
					var payload struct {
						Cols uint32
						Rows uint32
						X    uint32
						Y    uint32
					}
					ssh.Unmarshal(req.Payload, &payload)
					err := pty.Setsize(pty0, &pty.Winsize{Rows: uint16(payload.Rows), Cols: uint16(payload.Cols), X: uint16(payload.X), Y: uint16(payload.Y)})
					if err != nil {
						fmt.Fprintf(logw, "window-change: setsize failed: %s"+eol, err)
						break
					}
					ok = true
				case "env":
					// TODO: implement "env"
					// requests by setting env
					// vars in the docker-exec
					// command (not docker-exec's
					// own environment, which
					// would be a gaping security
					// hole).
				default:
					// fmt.Fprintf(logw, "declining %q req"+eol, req.Type)
				}
				if req.WantReply {
					req.Reply(ok, nil)
				}
			}
		}()
	}
}
