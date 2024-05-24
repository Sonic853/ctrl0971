// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

/// <reference types="w3c-web-usb" />

import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { AsyncSubject } from 'rxjs'
import { delay } from 'lib/delay'
import { HID } from 'lib/hid'
import {
  Ctrl,
  CtrlLog,
  CtrlProc,
  ConfigIndex,
  SectionIndex,
  PACKAGE_SIZE,
  CtrlConfigGet,
  CtrlConfigSet,
  CtrlConfigShare,
  CtrlProfileGet,
  CtrlSection,
  CtrlProfileSet,
  CtrlHandshakeGet,
  CtrlHandshakeSet,
  CtrlHandshakeShare,
} from 'lib/ctrl'

const ADDR_IN = 3
const ADDR_OUT = 4

interface PresetWithValues {
  presetIndex: number,
  values: number[],
}

@Injectable({
  providedIn: 'root'
})
export class WebusbService {
  browserIsCompatible = false
  device: any = null
  deviceVersion = [0, 0, 0]
  logs: string[] = []
  isConnected = false
  isConnectedRaw = false
  failed = false
  failedError?: Error
  pendingConfig?: AsyncSubject<CtrlConfigShare>
  pendingProfile?: AsyncSubject<CtrlSection>

  constructor(
    private router: Router,
  ) {
    this.logs = []
    this.browserIsCompatible = this.isBrowserCompatible()
    if (!this.browserIsCompatible) return
    navigator.usb.getDevices().then((devices) => {
      console.log('Devices found:', devices)
      this.logs = []
      if (!devices.length) return
      this.device = devices[0]
      this.openDevice()
    })
    navigator.usb.addEventListener("connect", (event:any) => {
      console.log('Device connected')
      this.logs = []
      this.device = event.device
      this.openDevice()
    })
    navigator.usb.addEventListener("disconnect", (event:any) => {
      console.log('Device disconnected')
      this.logs = []
      this.device = null
      this.isConnectedRaw = false
      this.deviceVersion = [0, 0, 0]
      delay(2000).then(() => {
        // Do not flicker while restarting the controller.
        if (!this.device) this.isConnected = false
      })
    })
  }

  isBrowserCompatible() {
    return !!navigator.usb
  }

  getFailedHint() {
    if (this.failedError?.message.includes('Access')) {
      return 'Missing Udev rules?'
    } else {
      return 'Try re-plugging the controller.'
    }
  }

  async requestDevice() {
    const filters = [
      {vendorId:0x0170},
      {vendorId:0x045E, productId:0x028E},
    ]
    this.device = await navigator.usb.requestDevice({filters});
    console.log('Request device:', this.device)
    await this.openDevice()
  }

  async forgetDevice() {
    this.device.forget()
    // Nuclear option since otherwise the same device cannot be requested again.
    window.location.reload()
  }

  async openDevice() {
    try {
      this.failed = false;
      (<any>window).device = this.device
      await this.device.open()
      console.log('Device opened')
      await this.device.selectConfiguration(1)
      console.log('Configuration selected')
      await this.device.claimInterface(1)
      console.log('Interface claimed')
      await this.sendEmpty()
      this.isConnected = true;
      this.isConnectedRaw = true;
      await this.sendHandshakeGet()
    } catch (error) {
      this.failed = true
      this.failedError = error as Error
      throw error
    } finally {
      if (this.router.url.startsWith('/help')) this.router.navigate([''])
    }
    this.listen()
  }

  async listen() {
    try {
      // console.log('Listening...')
      const response = await this.device.transferIn(ADDR_IN, PACKAGE_SIZE)
      const ctrl = Ctrl.decode(response.data.buffer as ArrayBuffer)
      // console.log('received', ctrl)
      if (ctrl instanceof CtrlLog) this.handleCtrlLog(ctrl)
      if (ctrl instanceof CtrlHandshakeShare) this.handleCtrlHandshakeShare(ctrl)
      if (ctrl instanceof CtrlConfigShare) {
        console.log(ctrl)
        if (this.pendingConfig) {
          this.pendingConfig.next(ctrl)
          this.pendingConfig.complete()
          this.pendingConfig = undefined
        } else {
          this.handleCtrlConfigShare(ctrl)
        }
      }
      if (ctrl instanceof CtrlSection) {
        console.log(ctrl)
        if (this.pendingProfile) {
          this.pendingProfile.next(ctrl as CtrlSection)
          this.pendingProfile.complete()
          this.pendingProfile = undefined
        }
      }
    } catch (error:any) {
      console.warn(error)
      return
    }
    await this.listen()
  }

  handleCtrlLog(ctrl: CtrlLog) {
    if (!this.logs[0] || this.logs[0]?.endsWith('\n')) {
      this.logs.unshift(ctrl.logMessage)
    } else {
      this.logs[0] += ctrl.logMessage
    }
    // console.log(ctrl.logMessage)
  }

  handleCtrlHandshakeShare(ctrl: CtrlHandshakeShare) {
    this.deviceVersion = ctrl.version
    console.log('Firmware of connected device:', this.deviceVersion)
    this.sendHandshakeSet()
  }

  handleCtrlConfigShare(ctrl: CtrlConfigShare) {
    // If there is no pending receiver for the config change we assume it is a
    // change made on the controller via shortcuts, and refresh the components.
    const url = this.router.url
    if (url.startsWith('/settings')) {
      this.router.navigateByUrl('/', {skipLocationChange: true}).then(() => {
        this.router.navigate([url])
      })
    }
  }

  clearLogs() {
    this.logs = []
  }

  async sendEmpty() {
    const data = new Uint8Array(64)
    await this.device.transferOut(ADDR_OUT, data)
  }

  async sendHandshakeGet() {
    const data = new CtrlHandshakeGet()
    await this.send(data)
  }

  async sendHandshakeSet() {
    const data = new CtrlHandshakeSet(Date.now())
    await this.send(data)
  }

  async sendRestart() {
    const data = new CtrlProc(HID.PROC_RESTART)
    await this.send(data)
  }

  async sendBootsel() {
    const data = new CtrlProc(HID.PROC_BOOTSEL)
    await this.send(data)
  }

  async sendCalibrate() {
    const data = new CtrlProc(HID.PROC_CALIBRATE)
    await this.send(data)
  }

  async sendFactory() {
    const data = new CtrlProc(HID.PROC_FACTORY)
    await this.send(data)
  }

  async send(ctrl: CtrlProc | CtrlHandshakeGet | CtrlHandshakeSet | CtrlConfigGet | CtrlProfileGet) {
    console.log(ctrl)
    await this.device.transferOut(ADDR_OUT, ctrl.encode())
  }

  async getConfig(index: ConfigIndex): Promise<PresetWithValues> {
    this.pendingConfig = new AsyncSubject()
    const ctrlOut = new CtrlConfigGet(index)
    await this.send(ctrlOut)
    return new Promise((resolve, reject) => {
      this.pendingConfig?.subscribe({
        next: (ctrlIn) => {
          resolve({presetIndex: ctrlIn.preset, values: ctrlIn.values})
        }
      })
    })
  }

  async setConfig(index: ConfigIndex, preset: number, values: number[]): Promise<number> {
    this.pendingConfig = new AsyncSubject()
    const ctrlOut = new CtrlConfigSet(index, preset, values)
    await this.send(ctrlOut)
    return new Promise((resolve, reject) => {
      this.pendingConfig?.subscribe({
        next: (ctrlIn) => {
          resolve(ctrlIn.preset)
        }
      })
    })
  }

  async getSection(
    profileIndex: number,
    sectionIndex: SectionIndex,
  ): Promise<CtrlSection> {
    this.pendingProfile = new AsyncSubject()
    const ctrlOut = new CtrlProfileGet(profileIndex, sectionIndex)
    await this.send(ctrlOut)
    return new Promise((resolve, reject) => {
      this.pendingProfile?.subscribe({
        next: (ctrlIn) => {
          resolve(ctrlIn)
        }
      })
    })
  }

  async setSection(
    profileIndex: number,
    section: CtrlSection,
  ) {
    this.pendingProfile = new AsyncSubject()
    const ctrlOut = new CtrlProfileSet(profileIndex, section.sectionIndex, section.payload())
    await this.send(ctrlOut)
    // TODO: Receive confirmation.
  }
}
