// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router'
import { WebusbService } from 'services/webusb'
import { MINUMUM_FIRMWARE_VERSION } from 'lib/version'


const RELEASES_LINK = 'https://github.com/inputlabs/alpakka_firmware/releases'
const FIRMWARE_ACK = 'firmware_ack'

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.sass']
})
export class HeaderComponent {
  route: string = ''
  dialogForget: any
  dialogFirmware: any
  lastRouteForTools = ''
  lastRouteForProfiles = '/profiles/0'
  lastRouteForSettings = '/settings/protocol'
  // Template aliases.
  LATEST_FIRMWARE = MINUMUM_FIRMWARE_VERSION
  RELEASES_LINK = RELEASES_LINK

  constructor(
    private router: Router,
    public webusb: WebusbService,
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.route = event.urlAfterRedirects
        // Remember route.
        if (this.route.startsWith('/tools')) {
          this.lastRouteForTools = this.route
        }
        if (this.route.startsWith('/profiles')) {
          this.lastRouteForProfiles = this.route
        }
        if (this.route.startsWith('/settings')) {
          this.lastRouteForSettings = this.route
        }
      }
    })
  }

  ngAfterViewChecked() {
    if (this.shouldWarningFirmware()) this.showDialogFirmware()
  }

  routeIsTools() {
    return this.route == '/' || this.route.startsWith('/tools')  ? 'active' : ''
  }

  showDialogForget() {
    this.dialogForget = document.getElementById('dialog-forget')
    this.dialogForget.showModal()
  }

  hideDialogForget(): boolean {
    this.dialogForget.close()
    return true
  }

  showDialogFirmware() {
    this.dialogFirmware = document.getElementById('dialog-firmware')
    this.dialogFirmware.showModal()
  }

  hideDialogFirmware(): boolean {
    this.dialogFirmware.close()
    return true
  }

  firmwareAsNumber(version: number[]) {
    return (version[0] * 1000000) + (version[1] * 1000) + version[2]
  }

  firmwareAsString(version: number[]) {
    return `${version[0]}.${version[1]}.${version[2]}`
  }

  firmwareAck() {
    const fwValue = this.firmwareAsNumber(MINUMUM_FIRMWARE_VERSION).toString()
    localStorage.setItem(FIRMWARE_ACK, fwValue)
  }

  shouldWarningFirmware() {
    // Should display a Forced modal window?.
    if (!this.webusb.isConnectedRaw) return false
    const minimumVersion = this.firmwareAsNumber(MINUMUM_FIRMWARE_VERSION)
    const deviceVersion = this.firmwareAsNumber(this.webusb.deviceVersion)
    const ackVersion = Number(localStorage.getItem(FIRMWARE_ACK))
    if (!deviceVersion) return 0
    return (deviceVersion < minimumVersion) && (ackVersion < minimumVersion)
  }

  shouldNotifyFirmware() {
    // Should notify as an icon in the header?.
    if (!this.webusb.isConnectedRaw) return false
    const minimumVersion = this.firmwareAsNumber(MINUMUM_FIRMWARE_VERSION)
    const deviceVersion = this.firmwareAsNumber(this.webusb.deviceVersion)
    return deviceVersion < minimumVersion
  }
}
