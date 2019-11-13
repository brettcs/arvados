// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import { Middleware } from "redux";
import { authActions, } from "./auth-action";
import { ServiceRepository, setAuthorizationHeader, removeAuthorizationHeader } from "~/services/services";
import { initSessions } from "~/store/auth/auth-action-session";
import { User } from "~/models/user";
import { RootState } from '~/store/store';

export const authMiddleware = (services: ServiceRepository): Middleware => store => next => action => {
    authActions.match(action, {
        INIT: ({ user, token }) => {
            next(action);
            const state: RootState = store.getState();
            if (state.auth.user) {
                services.authService.saveUser(state.auth.user);
            } else {
                services.authService.removeUser();
            }
            if (state.auth.apiToken) {
                services.authService.saveApiToken(state.auth.apiToken);
                setAuthorizationHeader(services, state.auth.apiToken);
            } else {
                services.authService.removeApiToken();
                removeAuthorizationHeader(services);
            }

            store.dispatch<any>(initSessions(services.authService, state.auth.remoteHostsConfig[state.auth.localCluster], user));
            if (!user.isActive) {
                services.userService.activate(user.uuid).then((user: User) => {
                    store.getState().dispatch(authActions.INIT({ user, token }));
                });
            }
        },
        CONFIG: ({ config }) => {
            document.title = `Arvados Workbench (${config.uuidPrefix})`;
            next(action);
        },
        default: () => next(action)
    });
};
