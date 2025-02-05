// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

/// <reference types="w3c-web-usb" />

import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { HID } from 'lib/hid'
import { Device, PresetWithValues } from 'lib/device'
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
    this.findDevices()
    this.configureCallbacks()
  }

  findDevices() {
    navigator.usb.getDevices().then((usbDevices) => {
      console.log('Devices found:', usbDevices)
      if (usbDevices.length == 0) return
      for(let usbDevice of usbDevices) {
        let device = new Device(usbDevice)
        this.devices.push(device)
        this.selectedDevice = device
      }
    })
  }

  configureCallbacks() {
    navigator.usb.addEventListener("connect", (event:any) => {
      console.log('Device connected')
      let device = new Device(event.device)
      this.devices.push(device)
      this.selectedDevice = device
    })
    navigator.usb.addEventListener("disconnect", (event:any) => {
      console.log('Device disconnected')
      for(let device of this.devices) {
        if (event.device == device.usbDevice) {
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
    // const filters = [
    //   {vendorId:0x0170},
    //   {vendorId:0x045E, productId:0x028E},
    // ]
    // this.device = await navigator.usb.requestDevice({filters});
    // console.log('Request device:', this.device)
    // await this.openDevice()
  }

  async forgetDevice() {
    // this.device.forget()
    // // Nuclear option since otherwise the same device cannot be requested again.
    // window.location.reload()
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

}
