// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { AsyncSubject } from 'rxjs'
import { HID } from 'lib/hid'
import { timeoutPromise } from 'lib/delay'
import { Profiles } from 'lib/profiles'
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
  CtrlStatusGet,
  CtrlStatusSet,
  CtrlStatusShare,
  CtrlProfileOverwrite,
} from 'lib/ctrl'

const ADDR_IN = 3
const ADDR_OUT = 4

export class Device {
  usbDevice: USBDevice
  deviceVersion = [0, 0, 0]
  logs: string[] = []
  isConnected = false
  isConnectedRaw = false
  isListening = false
  failed = false
  failedError?: Error
  pendingConfig?: AsyncSubject<CtrlConfigShare>
  pendingProfile?: AsyncSubject<CtrlSection>
  profiles: Profiles

  constructor(usbDevice: USBDevice) {
    this.usbDevice = usbDevice
    this.openDevice()
    // (<any>window).device = this.device
    this.profiles = new Profiles(this)
  }

  disconnectCallback() {
    this.logs = []
    this.isConnected = false
    this.isConnectedRaw = false
    this.isListening = false
    this.deviceVersion = [0, 0, 0]
  }

  async openDevice() {
    try {
      this.failed = false;
      await this.usbDevice.open()
      console.log('Device opened')
      await this.usbDevice.selectConfiguration(1)
      console.log('Configuration selected')
      await this.usbDevice.claimInterface(1)
      console.log('Interface claimed')
      await this.sendEmpty()
      this.isConnected = true;
      this.isConnectedRaw = true;
      await this.sendStatusGet()
    } catch (error) {
      this.failed = true
      this.failedError = error as Error
      throw error
    }
    // finally {
    //   if (this.router.url.startsWith('/help')) this.router.navigate([''])
    // }
    this.listen()
  }

  async listen() {
    this.isListening = true
    try {
      // console.log('Listening...')
      const response = await this.usbDevice.transferIn(ADDR_IN, PACKAGE_SIZE)
      let data = response.data as any
      const array = new Uint8Array(data.buffer)
      const ctrl = Ctrl.decode(array)
      // console.log('received', ctrl)
      if (ctrl instanceof CtrlLog) this.handleCtrlLog(ctrl)
      if (ctrl instanceof CtrlStatusShare) this.handleCtrlStatusShare(ctrl)
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

  isController() {
    if (this.usbDevice.productName == 'Alpakka') return true
    return false
  }

  handleCtrlLog(ctrl: CtrlLog) {
    if (!this.logs[0] || this.logs[0]?.endsWith('\n')) {
      this.logs.unshift(ctrl.logMessage)
    } else {
      this.logs[0] += ctrl.logMessage
    }
    // console.log(ctrl.logMessage)
  }

  handleCtrlStatusShare(ctrl: CtrlStatusShare) {
    this.deviceVersion = ctrl.version
    console.log('Firmware of connected device:', this.deviceVersion)
    this.sendStatusSet()
  }

  handleCtrlConfigShare(ctrl: CtrlConfigShare) {
    // If there is no pending receiver for the config change we assume it is a
    // change made on the controller via shortcuts, and refresh the components.

    // const url = this.router.url
    // if (url.startsWith('/settings')) {
    //   this.router.navigateByUrl('/', {skipLocationChange: true}).then(() => {
    //     this.router.navigate([url])
    //   })
    // }
  }

  async sendEmpty() {
    const data = new Uint8Array(64)
    await this.usbDevice.transferOut(ADDR_OUT, data)
  }

  async sendStatusGet() {
    const data = new CtrlStatusGet()
    await this.send(data)
  }

  async sendStatusSet() {
    const data = new CtrlStatusSet(Date.now())
    await this.send(data)
  }

  async sendProc(proc: HID) {
    const data = new CtrlProc(proc)
    await this.send(data)
  }

  async sendProfileOverwrite(indexTo: number, indexFrom: number) {
    const data = new CtrlProfileOverwrite(indexTo, indexFrom)
    await this.send(data)
  }

  async send(ctrl: CtrlProc | CtrlStatusGet | CtrlStatusSet | CtrlConfigGet | CtrlProfileGet) {
    console.log(ctrl)
    await this.usbDevice.transferOut(ADDR_OUT, ctrl.encode())
  }

  async getConfig(index: ConfigIndex): Promise<PresetWithValues> {
    this.pendingConfig = new AsyncSubject()
    const ctrlOut = new CtrlConfigGet(index)
    await this.send(ctrlOut)
    const responsePromise: Promise<PresetWithValues> = new Promise((resolve, reject) => {
      this.pendingConfig?.subscribe({
        next: (ctrlIn) => {
          resolve({presetIndex: ctrlIn.preset, values: ctrlIn.values})
        }
      })
    })
    const timeoutMessage = `Timeout in getConfig ${ConfigIndex[index]}`
    const timeout = timeoutPromise(200, timeoutMessage) as Promise<PresetWithValues>
    return Promise.race([responsePromise, timeout])
  }

  async setConfig(index: ConfigIndex, preset: number, values: number[]): Promise<number> {
    this.pendingConfig = new AsyncSubject()
    const ctrlOut = new CtrlConfigSet(index, preset, values)
    await this.send(ctrlOut)
    const responsePromise: Promise<number> = new Promise((resolve, reject) => {
      this.pendingConfig?.subscribe({
        next: (ctrlIn) => {
          resolve(ctrlIn.preset)
        }
      })
    })
    const timeoutMessage = `Timeout in setConfig ${ConfigIndex[index]}`
    const timeout = timeoutPromise(200, timeoutMessage) as Promise<number>
    return Promise.race([responsePromise, timeout])
  }

  async getSection(
    profileIndex: number,
    sectionIndex: SectionIndex,
  ): Promise<CtrlSection> {
    this.pendingProfile = new AsyncSubject()
    const ctrlOut = new CtrlProfileGet(profileIndex, sectionIndex)
    await this.send(ctrlOut)
    const responsePromise: Promise<CtrlSection> = new Promise((resolve, reject) => {
      this.pendingProfile?.subscribe({
        next: (ctrlIn) => {
          resolve(ctrlIn)
        }
      })
    })
    const timeoutMessage = `Timeout in getSection ${SectionIndex[sectionIndex]}`
    const timeout = timeoutPromise(200, timeoutMessage) as Promise<CtrlSection>
    return Promise.race([responsePromise, timeout])
  }

  async setSection(
    profileIndex: number,
    section: CtrlSection,
  ) {
    this.pendingProfile = new AsyncSubject()
    const ctrlOut = new CtrlProfileSet(profileIndex, section.sectionIndex, section.payload())
    await this.send(ctrlOut)
    const responsePromise = new Promise((resolve, reject) => {
      this.pendingProfile?.subscribe({
        next: (ctrlIn) => {
          resolve(ctrlIn)
        }
      })
    })
    const timeoutMessage = `Timeout in setSection`
    const timeout = timeoutPromise(200, timeoutMessage)
    return Promise.race([responsePromise, timeout])
  }

}

export interface PresetWithValues {
  presetIndex: number,
  values: number[],
}
