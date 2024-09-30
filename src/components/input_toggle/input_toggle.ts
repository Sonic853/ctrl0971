// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-input-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './input_toggle.html',
  styleUrls: ['./input_toggle.sass']
})
export class InputToggleComponent {
  @Input() value: boolean = false
  @Output() update = new EventEmitter<boolean>()

  toggle() {
    this.value = !this.value
    this.update.emit(this.value)
  }
}
