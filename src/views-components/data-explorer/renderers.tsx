// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { Grid, Typography, withStyles } from '@material-ui/core';
import { FavoriteStar } from '../favorite-star/favorite-star';
import { ResourceKind, TrashableResource } from '~/models/resource';
import { ProjectIcon, CollectionIcon, ProcessIcon, DefaultIcon, WorkflowIcon } from '~/components/icon/icon';
import { formatDate, formatFileSize } from '~/common/formatters';
import { resourceLabel } from '~/common/labels';
import { connect } from 'react-redux';
import { RootState } from '~/store/store';
import { getResource } from '~/store/resources/resources';
import { GroupContentsResource } from '~/services/groups-service/groups-service';
import { getProcess, Process, getProcessStatus, getProcessStatusColor } from '~/store/processes/process';
import { ArvadosTheme } from '~/common/custom-theme';
import { compose } from 'redux';

export const renderName = (item: { name: string; uuid: string, kind: string }) =>
    <Grid container alignItems="center" wrap="nowrap" spacing={16}>
        <Grid item>
            {renderIcon(item)}
        </Grid>
        <Grid item>
            <Typography color="primary" style={{ width: '450px' }}>
                {item.name}
            </Typography>
        </Grid>
        <Grid item>
            <Typography variant="caption">
                <FavoriteStar resourceUuid={item.uuid} />
            </Typography>
        </Grid>
    </Grid>;

export const ResourceName = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<GroupContentsResource>(props.uuid)(state.resources);
        return resource || { name: '', uuid: '', kind: '' };
    })(renderName);

export const renderIcon = (item: { kind: string }) => {
    switch (item.kind) {
        case ResourceKind.PROJECT:
            return <ProjectIcon />;
        case ResourceKind.COLLECTION:
            return <CollectionIcon />;
        case ResourceKind.PROCESS:
            return <ProcessIcon />;
        case ResourceKind.WORKFLOW:
            return <WorkflowIcon />;
        default:
            return <DefaultIcon />;
    }
};

export const renderDate = (date?: string) => {
    return <Typography noWrap style={{ minWidth: '100px' }}>{formatDate(date)}</Typography>;
};

export const ResourceLastModifiedDate = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<GroupContentsResource>(props.uuid)(state.resources);
        return { date: resource ? resource.modifiedAt : '' };
    })((props: { date: string }) => renderDate(props.date));

export const ResourceTrashDate = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<TrashableResource>(props.uuid)(state.resources);
        return { date: resource ? resource.trashAt : '' };
    })((props: { date: string }) => renderDate(props.date));

export const ResourceDeleteDate = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<TrashableResource>(props.uuid)(state.resources);
        return { date: resource ? resource.deleteAt : '' };
    })((props: { date: string }) => renderDate(props.date));

export const renderFileSize = (fileSize?: number) =>
    <Typography noWrap style={{ minWidth: '45px' }}>
        {formatFileSize(fileSize)}
    </Typography>;

export const ResourceFileSize = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<GroupContentsResource>(props.uuid)(state.resources);
        return {};
    })((props: { fileSize?: number }) => renderFileSize(props.fileSize));

export const renderOwner = (owner: string) =>
    <Typography noWrap color="primary" >
        {owner}
    </Typography>;

export const ResourceOwner = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<GroupContentsResource>(props.uuid)(state.resources);
        return { owner: resource ? resource.ownerUuid : '' };
    })((props: { owner: string }) => renderOwner(props.owner));

export const renderType = (type: string) =>
    <Typography noWrap>
        {resourceLabel(type)}
    </Typography>;

export const ResourceType = connect(
    (state: RootState, props: { uuid: string }) => {
        const resource = getResource<GroupContentsResource>(props.uuid)(state.resources);
        return { type: resource ? resource.kind : '' };
    })((props: { type: string }) => renderType(props.type));

export const ProcessStatus = compose(
    connect((state: RootState, props: { uuid: string }) => {
        return { process: getProcess(props.uuid)(state.resources) };
    }),
    withStyles({}, { withTheme: true }))
    ((props: { process?: Process, theme: ArvadosTheme }) => {
        const status = props.process ? getProcessStatus(props.process) : "-";
        return <Typography
            noWrap
            align="center"
            style={{ color: getProcessStatusColor(status, props.theme) }} >
            {status}
        </Typography>;
    });
