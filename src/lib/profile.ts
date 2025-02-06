// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { CtrlSectionMeta, CtrlButton, CtrlRotary, CtrlThumbstick, ButtonMode } from 'lib/ctrl'
import { SectionIndex, CtrlGyro, CtrlGyroAxis, CtrlHome } from 'lib/ctrl'
import { ActionGroup } from 'lib/actions'
import { HID } from 'lib/hid'

export class Profile {
  home: CtrlHome

  constructor (
    public meta: CtrlSectionMeta = new CtrlSectionMeta(0, 0, '', 0, 0, 0, 0),
    public buttonA: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonB: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonX: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonY: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDpadLeft: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDpadRight: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDpadUp: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDpadDown: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonSelect1: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonSelect2: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonStart1: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonStart2: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonL1: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonL2: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonL4: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonR1: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonR2: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonR4: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDhatLeft: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDhatRight: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDhatUp: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDhatDown: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDhatUL: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDhatUR: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDhatDL: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDhatDR: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonDhatPush: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonThumbstickLeft: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonThumbstickRight: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonThumbstickUp: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonThumbstickDown: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonThumbstickPush: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonThumbstickInner: CtrlButton = new CtrlButton(0, 0, 0),
    public buttonThumbstickOuter: CtrlButton = new CtrlButton(0, 0, 0),
    public rotaryUp: CtrlRotary = new CtrlRotary(0, 0),
    public rotaryDown: CtrlRotary = new CtrlRotary(0, 0),
    public thumbstick: CtrlThumbstick = new CtrlThumbstick(0, 0, 0, 0, 0, 0, false, 0),
    public gyro: CtrlGyro = new CtrlGyro(0, 0, 0, 0),
    public gyroX: CtrlGyroAxis = CtrlGyroAxis.default(),
    public gyroY: CtrlGyroAxis = CtrlGyroAxis.default(),
    public gyroZ: CtrlGyroAxis = CtrlGyroAxis.default(),
  ) {
    // Fake home definitions.
    const actions = [
      new ActionGroup([]),
      new ActionGroup([HID.PROC_PROFILE_0]),
      new ActionGroup([HID.PROC_HOME_GAMEPAD]),
    ]
    const labels = ['', '', 'Gamepad home']
    this.home = new CtrlHome(
      0,
      SectionIndex.HOME,
      ButtonMode.HOLD + ButtonMode.DOUBLE,
      actions,
      labels
    )
  }

  getSections() {
    return Object.values(this)
      .filter((value) => value.sectionIndex!=SectionIndex.HOME)
  }
}
