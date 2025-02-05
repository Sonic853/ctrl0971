// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

/// <reference types="w3c-web-usb" />

import { Ctrl, CtrlSectionMeta, CtrlButton, CtrlRotary, CtrlThumbstick, CtrlSection } from 'lib/ctrl'
import { MessageType, SectionIndex, CtrlGyro, CtrlGyroAxis } from 'lib/ctrl'
import { Device } from 'lib/device'
import { Profile } from 'lib/profile'

const NUMBER_OF_PROFILES = 13  // Home + 12 builtin.

export class Profiles {
  device: Device
  profiles: Profile[] = []
  syncedNames = false

  constructor(device: Device) {
    this.device = device
    this.initProfiles()
    // // Reset profiles if controller is disconnected.
    // if (webusb.isCompatibleBrowser()) {
    //   navigator.usb.addEventListener('disconnect', (event:any) => {
    //     this.initProfiles()
    //   })
    // }
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
    const section = await this.device.getSection(index, SectionIndex.META)
    this.profiles[index].meta = section as CtrlSectionMeta
  }

  async fetchProfile(profileIndex: number, strict: boolean) {
    const profile = this.profiles[profileIndex]
    // Replace internal meta properties instead of the whole object, so Angular
    // reference to the object is not lost. (Profile name is special because is
    // linked in many dynamic UI elements).
    const meta = await this.device.getSection(profileIndex, SectionIndex.META) as CtrlSectionMeta
    profile.meta.replaceContentsWith(meta)
    // Buttons.
    const getButton = async (sectionIndex: SectionIndex) => {
      return await this.device.getSection(profileIndex, sectionIndex) as CtrlButton
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
    const rotaryUp = await this.device.getSection(profileIndex, SectionIndex.ROTARY_UP) as CtrlRotary
    const rotaryDown = await this.device.getSection(profileIndex, SectionIndex.ROTARY_DOWN) as CtrlRotary
    profile.rotaryUp = rotaryUp
    profile.rotaryDown = rotaryDown
    // Thumbstick mode.
    const ts = await this.device.getSection(profileIndex, SectionIndex.THUMBSTICK) as CtrlThumbstick
    profile.thumbstick = ts
    // Gyro mode.
    const gyro = await this.device.getSection(profileIndex, SectionIndex.GYRO) as CtrlGyro
    profile.gyro = gyro
    // Gyro Axes.
    profile.gyroX = await this.device.getSection(profileIndex, SectionIndex.GYRO_X) as CtrlGyroAxis
    profile.gyroY = await this.device.getSection(profileIndex, SectionIndex.GYRO_Y) as CtrlGyroAxis
    profile.gyroZ = await this.device.getSection(profileIndex, SectionIndex.GYRO_Z) as CtrlGyroAxis
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
      await this.device.setSection(profileIndex, section)
    }
    this.fetchProfile(profileIndex, true)
  }
}
