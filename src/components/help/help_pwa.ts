// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { WebusbService } from 'services/webusb'

@Component({
  selector: 'app-help-pwa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './help_pwa.html',
  styleUrls: ['./help.sass']
})
export class HelpPWAComponent {
  constructor(
    public webusb: WebusbService
  ) {}
}
