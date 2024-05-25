// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { WebusbService } from 'services/webusb'

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logs.html',
  styleUrls: ['./logs.sass']
})
export class LogsComponent {
  dialogCalibrate: any
  dialogResetFactory: any
  dialogResetConfig: any
  dialogResetProfiles: any

  constructor(
    public webusb: WebusbService,
  ) {}

  downloadLogs() {
    if (this.webusb.logs.length == 0) return
    let logs = [...this.webusb.logs]
    logs.reverse()
    const data = logs.join('')
    const blob = new Blob([data], {type: 'text/plain'})
    const a = document.createElement('a')
    document.body.appendChild(a)
    // a.style = 'display: none'
    a.href = URL.createObjectURL(blob)
    a.download = 'alpakka_logs.txt'
    a.click()
    URL.revokeObjectURL(a.href)
    a.remove()
  }

  showDialogCalibrate() {
    this.dialogCalibrate = document.getElementById('dialog-calibrate')
    this.dialogCalibrate.showModal()
  }

  hideDialogCalibrate(): boolean {
    this.dialogCalibrate.close()
    return true
  }

  showDialogResetConfig() {
    this.dialogResetConfig = document.getElementById('dialog-reset-config')
    this.dialogResetConfig.showModal()
  }

  hideDialogResetConfig(): boolean {
    this.dialogResetConfig.close()
    return true
  }

  showDialogResetProfiles() {
    this.dialogResetProfiles = document.getElementById('dialog-reset-profiles')
    this.dialogResetProfiles.showModal()
  }

  hideDialogResetProfiles(): boolean {
    this.dialogResetProfiles.close()
    return true
  }

  showDialogResetFactory() {
    this.dialogResetFactory = document.getElementById('dialog-reset-factory')
    this.dialogResetFactory.showModal()
  }

  hideDialogResetFactory(): boolean {
    this.dialogResetFactory.close()
    return true
  }
}
