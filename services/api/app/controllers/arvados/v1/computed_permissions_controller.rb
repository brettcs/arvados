# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0

class Arvados::V1::ComputedPermissionsController < ApplicationController
  before_action :admin_required
end
