// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import { Tree, TreeNode, mapTreeValues, getNodeValue } from '~/models/tree';
import { CollectionFile, CollectionDirectory, CollectionFileType } from '~/models/collection-file';

export type CollectionPanelFilesState = Tree<CollectionPanelDirectory | CollectionPanelFile>;

export interface CollectionPanelDirectory extends CollectionDirectory {
    collapsed: boolean;
    selected: boolean;
}

export interface CollectionPanelFile extends CollectionFile {
    selected: boolean;
}

export const mapCollectionFileToCollectionPanelFile = (node: TreeNode<CollectionDirectory | CollectionFile>): TreeNode<CollectionPanelDirectory | CollectionPanelFile> => {
    return {
        ...node,
        value: node.value.type === CollectionFileType.DIRECTORY
            ? { ...node.value, selected: false, collapsed: true }
            : { ...node.value, selected: false }
    };
};

export const mergeCollectionPanelFilesStates = (oldState: CollectionPanelFilesState, newState: CollectionPanelFilesState) => {
    return mapTreeValues((value: CollectionPanelDirectory | CollectionPanelFile) => {
        const oldValue = getNodeValue(value.id)(oldState);
        return oldValue
            ? oldValue.type === CollectionFileType.DIRECTORY
                ? { ...value, collapsed: oldValue.collapsed, selected: oldValue.selected }
                : { ...value, selected: oldValue.selected }
            : value;
    })(newState);
}; 
