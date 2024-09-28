// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivatedRoute } from '@angular/router'
import { InputToggleComponent } from 'components/input_toggle/input_toggle'
import { WebusbService } from 'services/webusb'
import { ConfigIndex } from 'lib/ctrl'

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    InputToggleComponent,
  ],
  templateUrl: './settings.html',
  styleUrls: ['./settings.sass']
})
export class SettingsComponent {
  longCalibration = false
  swapGyros = false
  invertTouchPolarity = false

  constructor(
    private activatedRoute: ActivatedRoute,
    public webusb: WebusbService,
  ) {
  }

  ngAfterViewInit() {
    this.load()
  }

  async load() {
    const getConfig = async(index: ConfigIndex) => {
      return (await this.webusb.getConfig(index)).presetIndex
    }
    this.longCalibration = !!await getConfig(ConfigIndex.LONG_CALIBRATION)
    this.swapGyros = !!await getConfig(ConfigIndex.SWAP_GYROS)
    this.invertTouchPolarity = !!await getConfig(ConfigIndex.TOUCH_INVERT_POLARITY)
  }

  async saveLongCalibration() {
    await this.webusb.setConfig(ConfigIndex.LONG_CALIBRATION, +this.longCalibration, [])
  }
  async saveSwapGyros() {
    await this.webusb.setConfig(ConfigIndex.SWAP_GYROS, +this.swapGyros, [])
  }
  async saveInvertTouchPolarity() {
    await this.webusb.setConfig(ConfigIndex.TOUCH_INVERT_POLARITY, +this.invertTouchPolarity, [])
  }
}
