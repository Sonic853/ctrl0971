// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

/// <reference types="w3c-web-usb" />

import { Injectable } from '@angular/core'
import { WebusbService } from 'services/webusb'
import { Ctrl, CtrlSectionMeta, CtrlButton, CtrlRotary, CtrlThumbstick, CtrlSection, ButtonMode } from 'lib/ctrl'
import { MessageType, SectionIndex, CtrlGyro, CtrlGyroAxis, CtrlHome } from 'lib/ctrl'
import { ActionGroup } from 'lib/actions'
import { HID } from 'lib/hid'

const NUMBER_OF_PROFILES = 13  // Home + 12 builtin.

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

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  profiles: Profile[] = []
  syncedNames = false

  constructor(
    private webusb: WebusbService,
  ) {
    this.initProfiles()
    // Reset profiles if controller is disconnected.
    if (webusb.isBrowserCompatible()) {
      navigator.usb.addEventListener('disconnect', (event:any) => {
        this.initProfiles()
      })
    }
  }

  initProfiles() {
    for(let i of Array(NUMBER_OF_PROFILES).keys()) this.initProfile(i)
  }

  initProfile(index: number) {
    this.profiles[index] = new Profile()
    this.syncedNames = false
  }

  async fetchProfileNames() {
    if (this.syncedNames) return
    for(let index of Array(NUMBER_OF_PROFILES).keys()) {
      await this.fetchProfileName(index)
    }
    this.syncedNames = true
  }

  async fetchProfileName(index: number) {
    const section = await this.webusb.getSection(index, SectionIndex.META)
    this.profiles[index].meta = section as CtrlSectionMeta
  }

  async fetchProfile(profileIndex: number, strict: boolean) {
    const profile = this.profiles[profileIndex]
    // Replace internal meta properties instead of the whole object, so Angular
    // reference to the object is not lost. (Profile name is special because is
    // linked in many dynamic UI elements).
    const meta = await this.webusb.getSection(profileIndex, SectionIndex.META) as CtrlSectionMeta
    profile.meta.replaceContentsWith(meta)
    // Buttons.
    const getButton = async (sectionIndex: SectionIndex) => {
      return await this.webusb.getSection(profileIndex, sectionIndex) as CtrlButton
    }
    profile.buttonA = await getButton(SectionIndex.A)
    profile.buttonB = await getButton(SectionIndex.B)
    profile.buttonX = await getButton(SectionIndex.X)
    profile.buttonY = await getButton(SectionIndex.Y)
    profile.buttonDpadLeft = await getButton(SectionIndex.DPAD_LEFT)
    profile.buttonDpadRight = await getButton(SectionIndex.DPAD_RIGHT)
    profile.buttonDpadUp = await getButton(SectionIndex.DPAD_UP)
    profile.buttonDpadDown = await getButton(SectionIndex.DPAD_DOWN)
    profile.buttonSelect1 = await getButton(SectionIndex.SELECT_1)
    profile.buttonSelect2 = await getButton(SectionIndex.SELECT_2)
    profile.buttonStart1 = await getButton(SectionIndex.START_1)
    profile.buttonStart2 = await getButton(SectionIndex.START_2)
    profile.buttonL1 = await getButton(SectionIndex.L1)
    profile.buttonL2 = await getButton(SectionIndex.L2)
    profile.buttonL4 = await getButton(SectionIndex.L4)
    profile.buttonR1 = await getButton(SectionIndex.R1)
    profile.buttonR2 = await getButton(SectionIndex.R2)
    profile.buttonR4 = await getButton(SectionIndex.R4)
    profile.buttonDhatLeft = await getButton(SectionIndex.DHAT_LEFT)
    profile.buttonDhatRight = await getButton(SectionIndex.DHAT_RIGHT)
    profile.buttonDhatUp = await getButton(SectionIndex.DHAT_UP)
    profile.buttonDhatDown = await getButton(SectionIndex.DHAT_DOWN)
    profile.buttonDhatUL = await getButton(SectionIndex.DHAT_UL)
    profile.buttonDhatUR = await getButton(SectionIndex.DHAT_UR)
    profile.buttonDhatDL = await getButton(SectionIndex.DHAT_DL)
    profile.buttonDhatDR = await getButton(SectionIndex.DHAT_DR)
    profile.buttonDhatPush = await getButton(SectionIndex.DHAT_PUSH)
    profile.buttonThumbstickLeft = await getButton(SectionIndex.THUMBSTICK_LEFT)
    profile.buttonThumbstickRight = await getButton(SectionIndex.THUMBSTICK_RIGHT)
    profile.buttonThumbstickUp = await getButton(SectionIndex.THUMBSTICK_UP)
    profile.buttonThumbstickDown = await getButton(SectionIndex.THUMBSTICK_DOWN)
    profile.buttonThumbstickPush = await getButton(SectionIndex.THUMBSTICK_PUSH)
    profile.buttonThumbstickInner = await getButton(SectionIndex.THUMBSTICK_INNER)
    profile.buttonThumbstickOuter = await getButton(SectionIndex.THUMBSTICK_OUTER)
    // Rotary.
    const rotaryUp = await this.webusb.getSection(profileIndex, SectionIndex.ROTARY_UP) as CtrlRotary
    const rotaryDown = await this.webusb.getSection(profileIndex, SectionIndex.ROTARY_DOWN) as CtrlRotary
    profile.rotaryUp = rotaryUp
    profile.rotaryDown = rotaryDown
    // Thumbstick mode.
    const ts = await this.webusb.getSection(profileIndex, SectionIndex.THUMBSTICK) as CtrlThumbstick
    profile.thumbstick = ts
    // Gyro mode.
    const gyro = await this.webusb.getSection(profileIndex, SectionIndex.GYRO) as CtrlGyro
    profile.gyro = gyro
    // Gyro Axes.
    profile.gyroX = await this.webusb.getSection(profileIndex, SectionIndex.GYRO_X) as CtrlGyroAxis
    profile.gyroY = await this.webusb.getSection(profileIndex, SectionIndex.GYRO_Y) as CtrlGyroAxis
    profile.gyroZ = await this.webusb.getSection(profileIndex, SectionIndex.GYRO_Z) as CtrlGyroAxis
  }

  getProfile(profileIndex: number) {
    return this.profiles[profileIndex]
  }

  saveToBlob(profileIndex: number) {
    const profile = this.profiles[profileIndex]
    const data:number[] = []
    for(const section of profile.getSections()) {
      const sectionBinary = new Uint8Array(60)
      const payload = section.payload().slice(1)  // Remove profile index.
      for (let [i, value] of payload.entries()) {
        sectionBinary[i] = value
      }
      data.push(...sectionBinary)
    }
    return new Uint8Array(data)
  }

  async loadFromBlob(profileIndex: number, data: Uint8Array) {
    for(let i=0; i<data.length; i+=60) {
      const rawData = data.slice(i, i+60)
      const sectionData = [
        0,
        0,
        MessageType.SECTION_SHARE,
        0,
        profileIndex,
        ...rawData,
      ]
      const section = Ctrl.decode(new Uint8Array(sectionData)) as CtrlSection
      await this.webusb.setSection(profileIndex, section)
    }
    this.fetchProfile(profileIndex, true)
  }
}
