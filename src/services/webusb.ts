/// <reference types="w3c-web-usb" />
import { Injectable } from '@angular/core';
import { Router } from '@angular/router'
import { Observable, AsyncSubject } from 'rxjs';
import { delay } from '../lib/delay'
import {
  Ctrl,
  CtrlLog,
  CtrlProc,
  Proc,
  ConfigIndex,
  PACKAGE_SIZE,
  CtrlConfigGet,
  CtrlConfigSet,
  CtrlConfigGive,
} from '../lib/ctrl'

const ADDR_IN = 3
const ADDR_OUT = 4

@Injectable({
  providedIn: 'root'
})
export class WebusbService {
  browserIsCompatible = false
  device: any = null
  logs: string[] = []
  isConnected: boolean = false
  isConnectedRaw: boolean = false
  pending: AsyncSubject<CtrlConfigGive> | undefined

  constructor(
    private router: Router,
  ) {
    this.logs = []
    this.browserIsCompatible = this.checkBrowser()
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
      delay(2000).then(() => {
        // Do not flicker while restarting the controller.
        if (!this.device) this.isConnected = false
      })
    })
  }

  checkBrowser() {
    return !!navigator.usb
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
    this.listen()
  }

  async listen() {
    try {
      // console.log('Listening...')
      const response = await this.device.transferIn(ADDR_IN, PACKAGE_SIZE)
      const ctrl = Ctrl.decode(response.data)
      // console.log('received', ctrl)
      if (ctrl instanceof CtrlLog) this.handleCtrlLog(ctrl)
      if (ctrl instanceof CtrlConfigGive) {
        if (this.pending) {
          this.pending.next(ctrl)
          this.pending.complete()
          this.pending = undefined
        } else {
          this.handleCtrlGive(ctrl)
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

  handleCtrlGive(ctrl: CtrlConfigGive) {
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
    await this.device.transferOut(ADDR_OUT, data)  // TODO: use send()
  }

  async sendRestart() {
    const data = new CtrlProc(Proc.RESTART)
    await this.send(data)
  }

  async sendBootsel() {
    const data = new CtrlProc(Proc.BOOTSEL)
    await this.send(data)
  }

  async sendCalibrate() {
    const data = new CtrlProc(Proc.CALIBRATE)
    await this.send(data)
  }

  async sendFactory() {
    const data = new CtrlProc(Proc.FACTORY)
    await this.send(data)
  }

  async send(ctrl: CtrlProc | CtrlConfigGet) {
    console.log('send', ctrl)
    await this.device.transferOut(ADDR_OUT, ctrl.encode())
  }

  async getConfig(index: ConfigIndex): Promise<number> {
    this.pending = new AsyncSubject()
    const ctrlOut = new CtrlConfigGet(index)
    await this.send(ctrlOut)
    return new Promise((resolve, reject) => {
      this.pending?.subscribe({
        next: (ctrlIn) => {
          resolve(ctrlIn.value)
        }
      })
    })
  }

  async setConfig(index: ConfigIndex, preset: number): Promise<number> {
    this.pending = new AsyncSubject()
    const ctrlOut = new CtrlConfigSet(index, preset)
    await this.send(ctrlOut)
    return new Promise((resolve, reject) => {
      this.pending?.subscribe({
        next: (ctrlIn) => {
          resolve(ctrlIn.value)
        }
      })
    })
  }
}
