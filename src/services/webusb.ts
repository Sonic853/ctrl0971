// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

/// <reference types="w3c-web-usb" />

import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { HID } from 'lib/hid'
import { Device } from 'lib/device'
import { PresetWithValues } from 'lib/tunes'
import { ConfigIndex, SectionIndex, CtrlSection } from 'lib/ctrl'

@Injectable({
  providedIn: 'root'
})
export class WebusbService {
  devices: Device[] = []
  selectedDevice?: Device

  constructor(
    private router: Router,
  ) {
    if (!this.isCompatibleBrowser()) return
    this.checkForConnectedDevices()
    this.configureCallbacks()
  }

  checkForConnectedDevices() {
    navigator.usb.getDevices().then((usbDevices) => {
      console.log('Devices found:', usbDevices)
      if (usbDevices.length == 0) return
      for(let usbDevice of usbDevices) {
        this.addDevice(usbDevice)
      }
    })
  }

  configureCallbacks() {
    navigator.usb.addEventListener("connect", (event:any) => {
      console.log('Device connected')
      this.addDevice(event.device)
    })
    navigator.usb.addEventListener("disconnect", (event:any) => {
      console.log('Device disconnected')
      for(let device of this.devices) {
        if (event.device == device.usbDevice) {
          this.removeDevice(device)
        }
      }
    })
  }

  isCompatibleBrowser() {
    return !!navigator.usb
  }

  isConnected() {
    for(let device of this.devices) {
      if (device.isConnected) return true
    }
    return false
  }

  isConnectedRaw() {
    for(let device of this.devices) {
      if (device.isConnectedRaw) return true
    }
    return false
  }

  isFailed() {
    if (!this.selectedDevice) return false
    return this.selectedDevice!.failed
  }

  getFailedError() {
    return this.selectedDevice!.failedError
  }

  getFailedHint() {
    if (this.selectedDevice!.failedError?.message.includes('Access')) {
      return 'Missing Udev rules?'
    } else {
      return 'Try re-plugging the controller.'
    }
  }

  getDeviceVersion() {
    if (!this.selectedDevice) return [0,0,0]
    return this.selectedDevice!.deviceVersion
  }

  getManufacturerName() {
    if (!this.selectedDevice) return ''
    return this.selectedDevice.usbDevice.manufacturerName
  }

  getProductName() {
    if (!this.selectedDevice) return ''
    return this.selectedDevice.usbDevice.productName
  }

  async requestDevice() {
    const filters = [
      {vendorId:0x0170},
      {vendorId:0x045E, productId:0x028E},
    ]
    let usbDevice = await navigator.usb.requestDevice({filters});
    let usbDevices = this.devices.map((device) => device.usbDevice)
    if (!usbDevices.includes(usbDevice)) {
      let device = new Device(usbDevice)
      this.devices.push(device)
      this.selectedDevice = device
      this.router.navigate(['/'])
    }
  }

  addDevice(usbDevice: USBDevice) {
    let device = new Device(usbDevice)
    this.devices.push(device)
    this.selectDevice(device)
  }

  removeDevice(device: Device) {
    device.disconnectCallback()
    // Remove device from list.
    let index = this.devices.indexOf(device)
    this.devices.splice(index, 1);
    // Select other device.
    if (this.devices.length > 0) {
      this.selectedDevice = this.devices[0]
    } else {
      this.selectedDevice = undefined
    }
  }

  selectDevice(device: Device) {
    this.selectedDevice = device
    // Force protocol setting page if new device is dongle.
    const isDongle = !device.isController()
    if (isDongle && this.router.url.startsWith('/settings')) {
      this.router.navigateByUrl('/settings/protocol')
    }
  }

  listDevices() {
    return this.devices.sort((a, b) => a.isController() ? 1 : -1)
  }

  async forgetDevice() {
    await this.selectedDevice!.usbDevice.forget()
    this.removeDevice(this.selectedDevice!)
    // // Nuclear option since otherwise the same device cannot be requested again.
    // window.location.reload()  // Not needed anymore?
  }

  isController() {
    if (!this.selectedDevice) return false
    return this.selectedDevice.isController()
  }

  getLogs() {
    return this.selectedDevice!.logs
  }

  clearLogs() {
    this.selectedDevice!.logs = []
  }

  async sendProc(proc: HID) {
    return await this.selectedDevice!.sendProc(proc)
  }

  async sendProfileOverwrite(indexTo: number, indexFrom: number) {
    return await this.selectedDevice!.sendProfileOverwrite(indexTo, indexFrom)
  }

  async getConfig(index: ConfigIndex): Promise<PresetWithValues> {
    return await this.selectedDevice!.getConfig(index)
  }

  async setConfig(index: ConfigIndex, preset: number, values: number[]): Promise<number> {
    return await this.selectedDevice!.setConfig(index, preset, values)
  }

  async getSection(profileIndex: number, sectionIndex: SectionIndex): Promise<CtrlSection> {
    return await this.selectedDevice!.getSection(profileIndex, sectionIndex)
  }

  async setSection( profileIndex: number, section: CtrlSection) {
    return await this.selectedDevice!.setSection(profileIndex, section)
  }

  getProfiles() {
    if (!this.selectedDevice) return undefined
    return this.selectedDevice.profiles
  }

}
