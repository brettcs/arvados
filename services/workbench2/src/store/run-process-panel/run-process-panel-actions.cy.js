// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import { runProcess } from "./run-process-panel-actions";
import { RUN_PROCESS_BASIC_FORM, RUN_PROCESS_INPUTS_FORM } from "./run-process-panel-actions";
import { navigateTo } from "store/navigation/navigation-action";

describe("run-process-panel-actions", () => {
    describe("runProcess", () => {
        const newProcessUUID = 'newProcessUUID';
        let dispatch, getState, services;

        beforeEach(() => {
            dispatch = cy.spy();
            services = {
                containerRequestService: {
                    create: cy.stub().callsFake(async () => ({
                        uuid: newProcessUUID,
                    })),
                },
            };
            cy.spy(navigateTo).as('navigateTo');
        });

        it("should return when userUuid is null", async () => {
            // given
            getState = () => ({
                auth: {},
            });

            // when
            await runProcess(dispatch, getState, services);

            // then
            expect(dispatch).not.to.be.called;
        });

        it("should run workflow with project-uuid", async () => {
            // given
            getState = () => ({
                auth: {
                    user: {
                        email: "test@gmail.com",
                        firstName: "TestFirstName",
                        lastName: "TestLastName",
                        uuid: "zzzzz-tpzed-yid70bw31f51234",
                        ownerUuid: "zzzzz-tpzed-000000000000000",
                        isAdmin: false,
                        isActive: true,
                        username: "testfirstname",
                        prefs: {
                            profile: {},
                        },
                    },
                },
                runProcessPanel: {
                    processPathname: "/projects/zzzzz-tpzed-yid70bw31f51234",
                    processOwnerUuid: "zzzzz-tpzed-yid70bw31f51234",
                    selectedWorkflow: {
                        kind: "arvados#workflow",
                        etag: "8gh5xlhlgo61yqscyl1spw8tc",
                        uuid: "zzzzz-7fd4e-2tlnerdkxnl4fjt",
                        ownerUuid: "zzzzz-tpzed-o4njwilpp4ov321",
                        createdAt: "2020-07-15T19:40:50.296041000Z",
                        modifiedByClientUuid: "zzzzz-ozdt8-libnr89sc5nq111",
                        modifiedByUserUuid: "zzzzz-tpzed-o4njwilpp4ov321",
                        modifiedAt: "2020-07-15T19:40:50.296376000Z",
                        name: "revsort.cwl",
                        description:
                            "Reverse the lines in a document, then sort those lines.",
                        definition:
                            '{\n    "$graph": [\n        {\n            "class": "Workflow",\n            "doc": "Reverse the lines in a document, then sort those lines.",\n            "id": "#main",\n            "hints":[{"class":"http://arvados.org/cwl#WorkflowRunnerResources","acrContainerImage":"arvados/jobs:2.0.4", "ramMin": 16000}], "inputs": [\n                {\n                    "default": null,\n                    "doc": "The input file to be processed.",\n                    "id": "#main/input",\n                    "type": "File"\n                },\n                {\n                    "default": true,\n                    "doc": "If true, reverse (decending) sort",\n                    "id": "#main/reverse_sort",\n                    "type": "boolean"\n                }\n            ],\n            "outputs": [\n                {\n                    "doc": "The output with the lines reversed and sorted.",\n                    "id": "#main/output",\n                    "outputSource": "#main/sorted/output",\n                    "type": "File"\n                }\n            ],\n            "steps": [\n                {\n                    "id": "#main/rev",\n                    "in": [\n                        {\n                            "id": "#main/rev/input",\n                            "source": "#main/input"\n                        }\n                    ],\n                    "out": [\n                        "#main/rev/output"\n                    ],\n                    "run": "#revtool.cwl"\n                },\n                {\n                    "id": "#main/sorted",\n                    "in": [\n                        {\n                            "id": "#main/sorted/input",\n                            "source": "#main/rev/output"\n                        },\n                        {\n                            "id": "#main/sorted/reverse",\n                            "source": "#main/reverse_sort"\n                        }\n                    ],\n                    "out": [\n                        "#main/sorted/output"\n                    ],\n                    "run": "#sorttool.cwl"\n                }\n            ]\n        },\n        {\n            "baseCommand": "rev",\n            "class": "CommandLineTool",\n            "doc": "Reverse each line using the `rev` command",\n            "hints": [\n                {\n                    "class": "ResourceRequirement",\n                    "ramMin": 8\n                }\n            ],\n            "id": "#revtool.cwl",\n            "inputs": [\n                {\n                    "id": "#revtool.cwl/input",\n                    "inputBinding": {},\n                    "type": "File"\n                }\n            ],\n            "outputs": [\n                {\n                    "id": "#revtool.cwl/output",\n                    "outputBinding": {\n                        "glob": "output.txt"\n                    },\n                    "type": "File"\n                }\n            ],\n            "stdout": "output.txt"\n        },\n        {\n            "baseCommand": "sort",\n            "class": "CommandLineTool",\n            "doc": "Sort lines using the `sort` command",\n            "hints": [\n                {\n                    "class": "ResourceRequirement",\n                    "ramMin": 8\n                }\n            ],\n            "id": "#sorttool.cwl",\n            "inputs": [\n                {\n                    "id": "#sorttool.cwl/reverse",\n                    "inputBinding": {\n                        "position": 1,\n                        "prefix": "-r"\n                    },\n                    "type": "boolean"\n                },\n                {\n                    "id": "#sorttool.cwl/input",\n                    "inputBinding": {\n                        "position": 2\n                    },\n                    "type": "File"\n                }\n            ],\n            "outputs": [\n                {\n                    "id": "#sorttool.cwl/output",\n                    "outputBinding": {\n                        "glob": "output.txt"\n                    },\n                    "type": "File"\n                }\n            ],\n            "stdout": "output.txt"\n        }\n    ],\n    "cwlVersion": "v1.0"\n}',
                    },
                },
                form: {
                    [RUN_PROCESS_BASIC_FORM]: {
                        values: {
                            name: "basicFormTestName",
                            description: "basicFormTestDescription",
                        },
                    },
                    [RUN_PROCESS_INPUTS_FORM]: {
                        values: {
                            inputs: {},
                        }
                    }
                },
            });

            // when
            await runProcess(dispatch, getState, services);

            // then
            expect(services.containerRequestService.create).to.be.calledWithMatch(testCreateArgs);
            expect(dispatch).to.be.calledWithMatch(navigateTo(newProcessUUID));
        });
    });
});

const testMounts = {
    '/var/spool/cwl': {
        kind: 'collection',
        writable: true,
    },
    stdout: {
        kind: 'file',
        path: '/var/spool/cwl/cwl.output.json',
    },
    '/var/lib/cwl/workflow.json': {
        kind: 'json',
        content: {
            $graph: [
                {
                    class: 'Workflow',
                    doc: 'Reverse the lines in a document, then sort those lines.',
                    id: '#main',
                    hints: [
                        {
                            class: 'http://arvados.org/cwl#WorkflowRunnerResources',
                            acrContainerImage: 'arvados/jobs:2.0.4',
                            ramMin: 16000,
                        },
                    ],
                    inputs: [
                        {
                            default: null,
                            doc: 'The input file to be processed.',
                            id: '#main/input',
                            type: 'File',
                        },
                        {
                            default: true,
                            doc: 'If true, reverse (decending) sort',
                            id: '#main/reverse_sort',
                            type: 'boolean',
                        },
                    ],
                    outputs: [
                        {
                            doc: 'The output with the lines reversed and sorted.',
                            id: '#main/output',
                            outputSource: '#main/sorted/output',
                            type: 'File',
                        },
                    ],
                    steps: [
                        {
                            id: '#main/rev',
                            in: [
                                {
                                    id: '#main/rev/input',
                                    source: '#main/input',
                                },
                            ],
                            out: ['#main/rev/output'],
                            run: '#revtool.cwl',
                        },
                        {
                            id: '#main/sorted',
                            in: [
                                {
                                    id: '#main/sorted/input',
                                    source: '#main/rev/output',
                                },
                                {
                                    id: '#main/sorted/reverse',
                                    source: '#main/reverse_sort',
                                },
                            ],
                            out: ['#main/sorted/output'],
                            run: '#sorttool.cwl',
                        },
                    ],
                },
                {
                    baseCommand: 'rev',
                    class: 'CommandLineTool',
                    doc: 'Reverse each line using the `rev` command',
                    hints: [
                        {
                            class: 'ResourceRequirement',
                            ramMin: 8,
                        },
                    ],
                    id: '#revtool.cwl',
                    inputs: [
                        {
                            id: '#revtool.cwl/input',
                            inputBinding: {},
                            type: 'File',
                        },
                    ],
                    outputs: [
                        {
                            id: '#revtool.cwl/output',
                            outputBinding: {
                                glob: 'output.txt',
                            },
                            type: 'File',
                        },
                    ],
                    stdout: 'output.txt',
                },
                {
                    baseCommand: 'sort',
                    class: 'CommandLineTool',
                    doc: 'Sort lines using the `sort` command',
                    hints: [
                        {
                            class: 'ResourceRequirement',
                            ramMin: 8,
                        },
                    ],
                    id: '#sorttool.cwl',
                    inputs: [
                        {
                            id: '#sorttool.cwl/reverse',
                            inputBinding: {
                                position: 1,
                                prefix: '-r',
                            },
                            type: 'boolean',
                        },
                        {
                            id: '#sorttool.cwl/input',
                            inputBinding: {
                                position: 2,
                            },
                            type: 'File',
                        },
                    ],
                    outputs: [
                        {
                            id: '#sorttool.cwl/output',
                            outputBinding: {
                                glob: 'output.txt',
                            },
                            type: 'File',
                        },
                    ],
                    stdout: 'output.txt',
                },
            ],
            cwlVersion: 'v1.0',
        },
    },
    '/var/lib/cwl/cwl.input.json': {
        kind: 'json',
        content: {
            '': {},
        },
    },
};

const testCreateArgs = {
    command: [
        'arvados-cwl-runner',
        '--local',
        '--api=containers',
        "--no-log-timestamps",
        "--disable-color",
        '--project-uuid=zzzzz-tpzed-yid70bw31f51234',
        '/var/lib/cwl/workflow.json#main',
        '/var/lib/cwl/cwl.input.json',
    ],
    containerImage: 'arvados/jobs:2.0.4',
    cwd: '/var/spool/cwl',
    description: undefined,
    mounts: testMounts,
    secretMounts: undefined,
    name: 'basicFormTestName',
    outputName: 'Output from basicFormTestName',
    outputPath: '/var/spool/cwl',
    ownerUuid: 'zzzzz-tpzed-yid70bw31f51234',
    priority: 500,
    properties: {
        workflowName: 'revsort.cwl',
        template_uuid: 'zzzzz-7fd4e-2tlnerdkxnl4fjt',
    },
    runtimeConstraints: {
        API: true,
        ram: 16256 * (1024 * 1024),
        vcpus: 1,
    },
    schedulingParameters: { max_run_time: undefined },
    state: 'Committed',
    useExisting: false,
};
