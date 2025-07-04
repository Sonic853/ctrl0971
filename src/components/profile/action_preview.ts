// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { WebusbService } from 'services/webusb'
import { HID, isAxis } from 'lib/hid'
import { ActionGroup } from 'lib/actions'
import { CtrlButton, CtrlGyroAxis, CtrlRotary, CtrlHome, sectionIsAnalog } from 'lib/ctrl'

interface Chip {
  cls: string,
  text: string,
  icon: Icon,
}

interface Icon {
  icon: string,
  showLabel: boolean,
}

@Component({
  selector: 'app-action-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './action_preview.html',
  styleUrls: ['./action_preview.sass']
})
export class ButtonComponent {
  @Input() section: CtrlButton | CtrlRotary | CtrlGyroAxis
  @Input() analog: boolean = false

  constructor(
    public webusb: WebusbService,
  ) {
    this.section = undefined as unknown as CtrlButton
  }

  getActions(index: number) {
    // Get a copy so changes are not reflected anywhere else than in this
    // component.
    let actions = this.section.actions[index].copy()
    // Merge sticky mode actions.
    if (this.section instanceof CtrlButton) {
      if (this.section.sticky) {
        if (index == 0) actions = this.section.actions[0].merge(this.section.actions[1])
        else actions = new ActionGroup([0])
      }
    }
    // For rotary only show first action group.
    if (index == 1) {
      if (this.section instanceof CtrlRotary) {
        actions = new ActionGroup([0])
      }
    }
    return actions
  }

  getLabel(index: number): string {
    // Do not show labels if there are 3 groups of actions.
    if (this.section instanceof CtrlButton) {
      const isHome = this.section instanceof CtrlHome
      if (!isHome && this.section.hold && this.section.double) return ''
    }
    // Get label for actions.
    let label = this.section.labels[index] || ''
    if (index == 1) {
      if (this.section instanceof CtrlButton) {
        if (!this.section.hold && !this.section.sticky) label = ''
      }
      if (this.section instanceof CtrlRotary) label = ''
    }
    if (index == 2) {
      if (this.section instanceof CtrlButton) {
        if (!this.section.double) label = ''
      }
      if (this.section instanceof CtrlRotary) label = ''
    }
    return label
  }

  getText(action: number) {
    let label = HID[action]
    // Keys.
    label = label.replace('KEY_', '')
    if (label == 'ESCAPE') return 'Esc'
    if (label == 'TAB') return 'Tab'
    if (label == 'BACKQUOTE') return '`'
    if (label == 'MINUS') return '-'
    if (label == 'EQUALS') return '='
    if (label == 'BACKSLASH') return '\\'
    if (label == 'BRACKET_LEFT') return '['
    if (label == 'BRACKET_RIGHT') return ']'
    if (label == 'CAPS_LOCK') return 'Caps'
    if (label == 'SEMICOLON') return ';'
    if (label == 'QUOTE') return "'"
    if (label == 'COMMA') return ","
    if (label == 'PERIOD') return "."
    if (label == 'SLASH') return "/"
    if (label == 'INSERT') return 'Ins'
    if (label == 'DELETE') return 'Del'
    if (label == 'HOME') return 'Home'
    if (label == 'END') return 'End'
    if (label == 'PAGE_UP') return 'Page-'
    if (label == 'PAGE_DOWN') return 'Page+'
    if (label == 'PAD_NUMLOCK') return 'Lock'
    if (label == 'PAD_SLASH') return '/'
    if (label == 'PAD_ASTERISK') return '*'
    if (label == 'PAD_MINUS') return '-'
    if (label == 'PAD_PLUS') return '+'
    if (label == 'PAD_ENTER') return '↵'
    if (label == 'PAD_PERIOD') return '.'
    if (label.startsWith('PAD_')) return label.split('_')[1]
    // Mouse.
    if (label == 'MOUSE_X') return 'X+'
    if (label == 'MOUSE_Y') return 'Y+'
    if (label == 'MOUSE_X_NEG') return 'X-'
    if (label == 'MOUSE_Y_NEG') return 'Y-'
    if (label == 'MOUSE_SCROLL_UP') return 'Scroll+'
    if (label == 'MOUSE_SCROLL_DOWN') return 'Scroll-'
    label = label.replace(/^MOUSE_/, '')
    // Modifiers.
    if (label == 'CONTROL_LEFT') label = 'Ctrl'
    if (label == 'SHIFT_LEFT') label = 'Shift'
    if (label == 'ALT_LEFT') label = 'Alt'
    if (label == 'SUPER_LEFT') label = 'Win'
    if (label == 'CONTROL_RIGHT') label = 'RCtrl'
    if (label == 'SHIFT_RIGHT') label = 'RShift'
    if (label == 'ALT_RIGHT') label = 'RAlt'
    if (label == 'SUPER_RIGHT') label = 'RWin'
    // Proc.
    if (label == 'PROC_SLEEP') return 'Sleep'
    if (label == 'PROC_BOOTSEL') return 'Boot'
    if (label == 'PROC_CALIBRATE') return 'Calibrate'
    if (label == 'PROC_PAIR') return 'Pair'
    if (label == 'PROC_TUNE_OS') return 'OS'
    if (label == 'PROC_TUNE_MOUSE_SENS') return 'Mouse'
    if (label == 'PROC_TUNE_TOUCH_SENS') return 'Touch'
    if (label == 'PROC_TUNE_DEADZONE') return 'DZ'
    if (label == 'PROC_TUNE_UP') return 'Tune up'
    if (label == 'PROC_TUNE_DOWN') return 'Tune down'
    if (label.startsWith('PROC_PROFILE_')) {
      const profileIndex = Number(label.split('_')[2])
      label = this.webusb.getProfiles()!.profiles[profileIndex].meta.name
    }
    if (label.startsWith('PROC_MACRO_')) {
      const macroIndex = Number(label.split('_')[2])
      label = 'M' + macroIndex
    }
    if (label.startsWith('PROC_ROTARY_MODE')) label = label.split('_')[3]
    if (label.startsWith('PROC')) label = label.replace('PROC_', '')
    // Gamepad.
    label = label.replace('GAMEPAD_L1', 'LB')
    label = label.replace('GAMEPAD_R1', 'RB')
    label = label.replace('GAMEPAD_L3', 'LS')
    label = label.replace('GAMEPAD_R3', 'RS')
    if (label.startsWith('GAMEPAD_AXIS')) {
      label = label.replace('GAMEPAD_AXIS_', '')
      if (label.endsWith('NEG')) label = label.replace('_NEG', '-')
      else label += '+'
    }
    label = label.replace('GAMEPAD_', '')
    return label
  }

  getIcon(action: number) {
    const hid = HID[action]
    let icon = ''
    let showLabel = false
    if (hid.startsWith('PROC_PROFILE')) {
      icon = 'stadia_controller'
      showLabel = true
    }
    if (hid.startsWith('PROC_TUNE')) {
      icon = 'settings'
      showLabel = true
    }
    if (hid.startsWith('PROC_ROTARY_MODE')) {
      icon = 'screen_record'
      showLabel = true
    }
    if (hid.startsWith('MOUSE_')) {
      icon = 'mouse'
      showLabel = true
    }
    if (hid.startsWith('KEY_PAD')) {
      icon = 'dialpad'
      showLabel = true
    }
    if (hid.startsWith('PROC_MACRO_')) {
      icon = 'keyboard'
      showLabel = true
    }
    if (hid == 'KEY_SPACE') icon = 'space_bar'
    if (hid == 'KEY_BACKSPACE') icon = 'backspace'
    if (hid == 'KEY_ENTER') icon = 'keyboard_return'
    if (hid == 'KEY_PRINT_SCREEN') icon = 'photo_camera'
    if (hid == 'KEY_SCROLL_LOCK') icon = 'sync_lock'
    if (hid == 'KEY_PAUSE') icon = 'pause_circle'
    if (hid == 'KEY_MUTE') icon = 'volume_off'
    if (hid == 'KEY_VOLUME_UP') icon = 'volume_up'
    if (hid == 'KEY_VOLUME_DOWN') icon = 'volume_down'
    if (hid == 'KEY_POWER') icon = 'power_settings_new'
    if (hid == 'GAMEPAD_SELECT') icon = 'stack'
    if (hid == 'GAMEPAD_START') icon = 'menu'
    if (hid == 'PROC_HOME_GAMEPAD') icon = 'home'
    if (['KEY_LEFT', 'GAMEPAD_LEFT'].includes(hid)) icon = 'arrow_back'
    if (['KEY_RIGHT', 'GAMEPAD_RIGHT'].includes(hid)) icon = 'arrow_forward'
    if (['KEY_UP', 'GAMEPAD_UP'].includes(hid)) icon = 'arrow_upward'
    if (['KEY_DOWN', 'GAMEPAD_DOWN'].includes(hid)) icon = 'arrow_downward'
    return {icon, showLabel}
  }

  getClass(index: number, action: number, text: string, icon: any) {
    let cls = 'press'
    const hid = HID[action]
    if (hid.startsWith('KEY')) cls += ' square round'
    if (hid.startsWith('MOUSE')) cls += ' square round'
    if (hid.startsWith('GAMEPAD')) cls += ' circle'
    if (action == HID.PROC_HOME_GAMEPAD) cls += ' circle'
    if (icon.icon && !icon.showLabel) cls += ' icon fixed'
    if (!icon.icon && text.length == 1) cls += ' fixed'
    if (this.section instanceof CtrlButton) {
      if (index==1 && this.section.hold) cls += ' hold'
      if (index==2 && this.section.double) cls += ' double'
    }
    if (this.analog && sectionIsAnalog(this.section.sectionIndex) && isAxis(action)) {
      cls += ' analog'
    }
    return cls
  }

  getGroupClass(index: number) {
    const wrapConditions = (
      index==0 &&
      this.getActions(1).sizeValid() == 0 &&
      this.section.labels[0]?.length > 0
    )
    return wrapConditions ? 'wrap' : ''
  }

  getChips(index: number): Chip[] {
    if (index == 0) {
      return this.getActions(0).asArray()
        .map((action: number) => {
          const text = this.getText(action)
          const icon = this.getIcon(action)
          const cls = this.getClass(0, action, text, icon)
          return {cls, text, icon}
        })
    }
    if (index == 1) {
      if (this.section.actions[1] === undefined) return []
      if (this.section instanceof CtrlButton) {
        if (!this.section.sticky) {
          if (!this.section.hold) return []
          if (this.getActions(1).actions.size == 0) return [emptyHoldChip]
        }
      }
      if (this.getActions(1).actions.size == 0) return []
      return this.getActions(1).asArray()
        .filter((action: number) => {
          return action != HID.PROC_THANKS  // Do not show easter egg.
        })
        .map((action: number) => {
          const text = this.getText(action)
          const icon = this.getIcon(action)
          let cls = this.getClass(1, action, text, icon)
          return {cls, text, icon}
        })
    }
    if (index == 2) {
      if (this.section.actions[2] === undefined) return []
      if (this.section instanceof CtrlButton) {
        if (!this.section.double) return []
        if (this.getActions(2).actions.size == 0) return [emptyDoubleChip]
      }
      if (this.getActions(2).actions.size == 0) return []
      if (this.section instanceof CtrlRotary) return []
      return this.getActions(2).asArray()
        .map((action: number) => {
          const text = this.getText(action)
          const icon = this.getIcon(action)
          let cls = this.getClass(2, action, text, icon)
          return {cls, text, icon}
        })
    }
    return []
  }
}

const emptyHoldChip: Chip = {
  text: '',
  cls: 'square round fixed hold',
  icon: {icon: '', showLabel: false},
}

const emptyDoubleChip: Chip = {
  text: '',
  cls: 'square round fixed double',
  icon: {icon: '', showLabel: false},
}
