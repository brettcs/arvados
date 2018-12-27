// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

import * as React from 'react';
import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import { reduxForm, Field } from 'redux-form';
import { Grid } from '@material-ui/core';
import { TextField } from '~/components/text-field/text-field';
import { ExpandIcon } from '~/components/icon/icon';
import * as IntInput from './inputs/int-input';
import { require } from '~/validators/require';
import { min } from '~/validators/min';
import { optional } from '~/validators/optional';

export const RUN_PROCESS_ADVANCED_FORM = 'runProcessAdvancedForm';

export const OUTPUT_FIELD = 'output';
export const RUNTIME_FIELD = 'runtime';
export const RAM_FIELD = 'ram';
export const VCPUS_FIELD = 'vcpus';
export const KEEP_CACHE_RAM_FIELD = 'keepCacheRam';

export interface RunProcessAdvancedFormData {
    [OUTPUT_FIELD]?: string;
    [RUNTIME_FIELD]?: string;
    [RAM_FIELD]: number;
    [VCPUS_FIELD]: number;
    [KEEP_CACHE_RAM_FIELD]?: number;
}

export const RunProcessAdvancedForm =
    reduxForm<RunProcessAdvancedFormData>({
        form: RUN_PROCESS_ADVANCED_FORM,
        initialValues: {
            [RAM_FIELD]: 1073741824,
            [VCPUS_FIELD]: 1,
        },
    })(() =>
        <form>
            <ExpansionPanel elevation={0}>
                <ExpansionPanelSummary style={{ padding: 0 }} expandIcon={<ExpandIcon />}>
                    Advanced
                </ExpansionPanelSummary>
                <ExpansionPanelDetails style={{ padding: 0 }}>
                    <Grid container spacing={32}>
                        <Grid item xs={12} md={6}>
                            <Field
                                name={OUTPUT_FIELD}
                                component={TextField}
                                label="Output name" />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Field
                                name={RUNTIME_FIELD}
                                component={TextField}
                                label="Runtime limit (hh)" />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Field
                                name={RAM_FIELD}
                                component={TextField}
                                label="RAM"
                                helperText="Number of ram bytes to be used to run this process."
                                parse={IntInput.parse}
                                format={IntInput.format}
                                type='number'
                                required
                                validate={ramValidation} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Field
                                name={VCPUS_FIELD}
                                component={TextField}
                                label="VCPUs"
                                helperText="Number of cores to be used to run this process."
                                parse={IntInput.parse}
                                format={IntInput.format}
                                type='number'
                                required
                                validate={vcpusValidation} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Field
                                name={KEEP_CACHE_RAM_FIELD}
                                component={TextField}
                                label="Keep cache RAM"
                                helperText="Number of keep cache bytes to be used to run this process."
                                parse={IntInput.parse}
                                format={IntInput.format}
                                type='number'
                                validate={keepCacheRamValdation} />
                        </Grid>
                    </Grid>
                </ExpansionPanelDetails>
            </ExpansionPanel>
        </form >);

const ramValidation = [min(0)];
const vcpusValidation = [min(1)];
const keepCacheRamValdation = [optional(min(0))];
