// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { HID } from 'lib/hid'
import { uint64_to_uint8_array } from 'lib/bigint'
import { ActionGroup } from './actions'

export const PACKAGE_SIZE = 64

enum DeviceId {
  ALPAKKA = 1,
}

export enum MessageType {
  LOG = 1,
  PROC,
  CONFIG_GET,
  CONFIG_SET,
  CONFIG_SHARE,
  SECTION_GET,
  SECTION_SET,
  SECTION_SHARE,
  STATUS_GET,
  STATUS_SET,
  STATUS_SHARE,
  PROFILE_OVERWRITE,
}

export enum ConfigIndex {
  PROTOCOL = 1,
  SENS_TOUCH,
  SENS_MOUSE,
  DEADZONE,
}

export enum SectionIndex {
  NONE,
  META,
  A = 2,
  B,
  X,
  Y,
  DPAD_LEFT,
  DPAD_RIGHT,
  DPAD_UP,
  DPAD_DOWN,
  SELECT_1,
  START_1,
  SELECT_2,
  START_2,
  L1,
  R1,
  L2,
  R2,
  L4,
  R4,
  DHAT_LEFT,
  DHAT_RIGHT,
  DHAT_UP,
  DHAT_DOWN,
  DHAT_UL,
  DHAT_UR,
  DHAT_DL,
  DHAT_DR,
  DHAT_PUSH,
  ROTARY_UP,
  ROTARY_DOWN,
  THUMBSTICK,
  THUMBSTICK_LEFT,
  THUMBSTICK_RIGHT,
  THUMBSTICK_UP,
  THUMBSTICK_DOWN,
  THUMBSTICK_PUSH,
  THUMBSTICK_INNER,
  THUMBSTICK_OUTER,
  GLYPHS_0,
  GLYPHS_1,
  GLYPHS_2,
  GLYPHS_3,
  DAISY_0,
  DAISY_1,
  DAISY_2,
  DAISY_3,
  GYRO,
  GYRO_X,
  GYRO_Y,
  GYRO_Z,
  MACRO_1,
  MACRO_2,
  MACRO_3,
  MACRO_4,
  HOME = 100,
}

export enum ButtonMode {
  NORMAL = 1,
  HOLD = 2,
  DOUBLE = 4,
  IMMEDIATE = 8,
  LONG = 16,
  STICKY = 32,
}

export enum ThumbstickMode {
  OFF,
  DIR4,
  ALPHANUMERIC,
}

export enum ThumbstickDistanceMode {
  AXIAL,
  RADIAL,
}

export enum GyroMode {
  OFF,
  ALWAYS_ON,
  TOUCH_OFF,
  TOUCH_ON,
  AXIS_ABSOLUTE,
}

export function sectionIsMeta(section: SectionIndex) {
  return section == SectionIndex.META
}

export function sectionIsButton(section: SectionIndex) {
  return (
    (section >= SectionIndex.A && section <= SectionIndex.DHAT_PUSH) ||
    (section >= SectionIndex.THUMBSTICK_LEFT && section <= SectionIndex.THUMBSTICK_OUTER)
  )
}

export function sectionIsRotary(section: SectionIndex) {
  return section == SectionIndex.ROTARY_UP || section == SectionIndex.ROTARY_DOWN
}

export function sectionIsThumbtick(section: SectionIndex) {
  return section == SectionIndex.THUMBSTICK
}

export function sectionIsThumbtickDirection(section: SectionIndex) {
  return section >= SectionIndex.THUMBSTICK_LEFT && section <= SectionIndex.THUMBSTICK_DOWN
}

export function sectionIsThumbtickButton(section: SectionIndex) {
  return sectionIsThumbtickDirection(section) || section == SectionIndex.THUMBSTICK_PUSH
}

export function sectionIsGyro(section: SectionIndex) {
  return section == SectionIndex.GYRO
}

export function sectionIsGyroAxis(section: SectionIndex) {
  return section >= SectionIndex.GYRO_X && section <= SectionIndex.GYRO_Z
}

export function sectionIsHome(section: SectionIndex) {
  return section == SectionIndex.HOME
}

export function sectionIsAnalog(section: SectionIndex) {
  return sectionIsThumbtickDirection(section) || sectionIsGyroAxis(section)
}

function string_from_slice(buffer: Uint8Array, start: number, end: number) {
  return new TextDecoder().decode(buffer.slice(start, end)).replace(/\0/g, '')
}

function string_to_buffer(size: number, str: string) {
  const buffer = new Uint8Array(size)
  new TextEncoder().encodeInto(str, buffer)
  return buffer
}

export class Ctrl {
  constructor(
    public protocolVersion: number,
    public deviceId: number,
    public messageType: MessageType,
  ) {}

  payload() {
    return [] as number[]
  }

  encode() {
    const data = new Uint8Array(PACKAGE_SIZE)
    // console.log(data)
    data[0] = this.protocolVersion
    data[1] = this.deviceId
    data[2] = this.messageType
    data[3] = this.payload().length
    for (let [i, value] of this.payload().entries()) {
      data[4+i] = value
    }
    return data
  }

  static decode(buffer: Uint8Array) {
    // See: https://github.com/inputlabs/alpakka_firmware/blob/main/docs/ctrl_protocol.md
    const data = Array.from(buffer)
    const msgType = data[2]
    if (msgType== MessageType.LOG) return CtrlLog.decode(buffer)
    if (msgType== MessageType.STATUS_SHARE) return CtrlStatusShare.decode(buffer)
    if (msgType == MessageType.CONFIG_SHARE) return CtrlConfigShare.decode(buffer)
    if (msgType == MessageType.SECTION_SHARE) {
      const section = data[5]
      if (sectionIsMeta(section)) return CtrlSectionMeta.decode(buffer)
      if (sectionIsButton(section)) return CtrlButton.decode(buffer)
      if (sectionIsRotary(section)) return CtrlRotary.decode(buffer)
      if (sectionIsThumbtick(section)) return CtrlThumbstick.decode(buffer)
      if (sectionIsGyro(section)) return CtrlGyro.decode(buffer)
      if (sectionIsGyroAxis(section)) return CtrlGyroAxis.decode(buffer)
    }
    return false
  }
}

export class CtrlLog extends Ctrl {
  constructor(
    public override protocolVersion: number,
    public override deviceId: number,
    public logMessage: string
  ) {
    super(protocolVersion, deviceId, MessageType.LOG)
  }

  static override decode(buffer: Uint8Array) {
    const data = Array.from(buffer)
    return new CtrlLog(
      data[0],  // ProtocolVersion.
      data[1],  // DeviceId.
      string_from_slice(buffer, 4, 64)  // Log message.
    )
  }

  override payload() {
    return Array.from(new TextEncoder().encode(this.logMessage))
  }
}

export class CtrlProc extends Ctrl {
  constructor(
    public proc: HID
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.PROC)
  }

  override payload() {
    return [this.proc]
  }
}

export class CtrlProfileOverwrite extends Ctrl {
  constructor(
    public indexTo: number,
    public indexFrom: number,
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.PROFILE_OVERWRITE)
  }

  override payload() {
    return [this.indexTo, this.indexFrom]
  }
}

export class CtrlConfigGet extends Ctrl {
  constructor(
    public cfgIndex: ConfigIndex
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.CONFIG_GET)
  }

  override payload() {
    return [this.cfgIndex]
  }
}

export class CtrlConfigSet extends Ctrl {
  constructor(
    public cfgIndex: ConfigIndex,
    public preset: number,
    public values: number[],
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.CONFIG_SET)
  }

  override payload() {
    return [this.cfgIndex, this.preset, ...this.values]
  }
}

export class CtrlConfigShare extends Ctrl {
  constructor(
    public cfgIndex: ConfigIndex,
    public preset: number,
    public values: number[],
  ) {
    const payload = [cfgIndex, preset, values]
    super(1, DeviceId.ALPAKKA, MessageType.CONFIG_SHARE)
  }

  static override decode(buffer: Uint8Array) {
    const data = Array.from(buffer)
    return new CtrlConfigShare(
      data[4],  // ConfigIndex.
      data[5],  // Preset.
      [data[6], data[7], data[8], data[9], data[10]],  // Values.
    )
  }

  override payload() {
    return [this.cfgIndex, this.preset, ...this.values]
  }
}

export class CtrlProfileGet extends Ctrl {
  constructor(
    public profileIndex: number,
    public sectionIndex: SectionIndex,
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.SECTION_GET)
  }

  override payload() {
    return [this.profileIndex, this.sectionIndex]
  }
}

export class CtrlProfileSet extends Ctrl {
  constructor(
    public profileIndex: number,
    public sectionIndex: SectionIndex,
    protected _payload: number[]
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.SECTION_SET)
  }

  override payload() {
    return this._payload
  }
}

export class CtrlProfileShare extends Ctrl {
  constructor(
    public profileIndex: number,
    public sectionIndex: SectionIndex,
    public values: number[],
  ) {
    const payload = [profileIndex, sectionIndex, values]
    super(1, DeviceId.ALPAKKA, MessageType.SECTION_SHARE)
  }

  override payload() {
    return [this.profileIndex, this.sectionIndex, ...this.values]
  }
}

export abstract class CtrlSection extends Ctrl {
  profileIndex: number = 0
  sectionIndex: SectionIndex = 0
}

export class CtrlSectionMeta extends CtrlSection {
  constructor(
    public override profileIndex: number,
    public override sectionIndex: SectionIndex,
    public name: string,
    public controlByte: number,
    public versionMajor: number,
    public versionMinor: number,
    public versionPatch: number,
  ) {
    const payload = [profileIndex, sectionIndex, name]
    super(1, DeviceId.ALPAKKA, MessageType.SECTION_SHARE)
  }

  static override decode(buffer: Uint8Array) {
    const data = Array.from(buffer)
    return new CtrlSectionMeta(
      data[4],  // ProfileIndex.
      data[5],  // SectionIndex.
      string_from_slice(buffer, 6, 30),  // Name.
      data[30],  // Control byte.
      data[31],  // Version major.
      data[32],  // Version minor.
      data[33],  // Version patch.
    )
  }

  override payload() {
    return [
      this.profileIndex,
      this.sectionIndex,
      ...string_to_buffer(24, this.name),
      this.controlByte,
      this.versionMajor,
      this.versionMinor,
      this.versionPatch,
    ]
  }

  replaceContentsWith(meta: CtrlSectionMeta) {
    this.name = meta.name
    this.controlByte = meta.controlByte
    this.versionMajor = meta.versionMajor
    this.versionMinor = meta.versionMinor
    this.versionPatch = meta.versionPatch
  }
}

export class CtrlButton extends CtrlSection {
  hold = false
  double = false
  immediate = false
  long = false
  sticky = false

  constructor(
    public override profileIndex: number,
    public override sectionIndex: SectionIndex,
    private _mode: number,
    public actions: ActionGroup[] = Array(3).fill(ActionGroup.empty(4)),
    public labels: string[] = Array(3).fill(''),
  ) {
    const payload: number[] = []
    super(1, DeviceId.ALPAKKA, MessageType.SECTION_SHARE)
    if (_mode & ButtonMode.HOLD) this.hold = true
    if (_mode & ButtonMode.DOUBLE) this.double = true
    if (_mode & ButtonMode.IMMEDIATE) this.immediate = true
    if (_mode & ButtonMode.LONG) this.long = true
    if (_mode & ButtonMode.STICKY) this.sticky = true
  }

  mode(): ButtonMode {
    let mode = 0
    if (this.hold) mode += ButtonMode.HOLD
    if (this.double) mode += ButtonMode.DOUBLE
    if (this.immediate) mode += ButtonMode.IMMEDIATE
    if (this.long) mode += ButtonMode.LONG
    if (this.sticky) mode += ButtonMode.STICKY
    if (mode === 0) mode = ButtonMode.NORMAL
    return mode
  }

  static override decode(buffer: Uint8Array) {
    const data = Array.from(buffer)
    return new CtrlButton(
      data[4],  // ProfileIndex.
      data[5],  // SectionIndex.
      data[6],  // Mode.
      [
        new ActionGroup(data.slice(7, 11)),  // Actions 0.
        new ActionGroup(data.slice(11, 15)), // Actions 1.
        new ActionGroup(data.slice(15, 19)), // Actions 2.
      ],
      [
        string_from_slice(buffer, 19, 33),  // Label 0.
        string_from_slice(buffer, 33, 47),  // Label 1.
        string_from_slice(buffer, 47, 61),  // Label 2.
      ]
    )
  }

  override payload() {
    return [
      this.profileIndex,
      this.sectionIndex,
      this.mode(),
      ...this.actions[0].asArrayPadded(),
      ...this.actions[1].asArrayPadded(),
      ...this.actions[2].asArrayPadded(),
      ...string_to_buffer(14, this.labels[0]),
      ...string_to_buffer(14, this.labels[1]),
      ...string_to_buffer(14, this.labels[2]),
    ]
  }
}

export class CtrlRotary extends CtrlSection {
  constructor(
    public override profileIndex: number,
    public override sectionIndex: SectionIndex,
    public actions: ActionGroup[] = Array(5).fill(ActionGroup.empty(4)),
    public labels: string[] = Array(5).fill(''),
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.SECTION_SHARE)
  }

  static override decode(buffer: Uint8Array) {
    const data = Array.from(buffer)
    return new CtrlRotary(
      data[4],  // ProfileIndex.
      data[5],  // SectionIndex.
      [
        new ActionGroup(data.slice(6, 10)),  // Actions
        new ActionGroup(data.slice(10, 14)), // Actions
        new ActionGroup(data.slice(14, 18)), // Actions
        new ActionGroup(data.slice(18, 22)), // Actions
        new ActionGroup(data.slice(22, 26)), // Actions
      ],
      [
        string_from_slice(buffer, 26, 40), // Label
        string_from_slice(buffer, 40, 46), // Label
        string_from_slice(buffer, 46, 52), // Label
        string_from_slice(buffer, 52, 58), // Label
        string_from_slice(buffer, 58, 64), // Label
      ]
    )
  }

  override payload() {
    return [
      this.profileIndex,
      this.sectionIndex,
      ...this.actions[0].asArrayPadded(),
      ...this.actions[1].asArrayPadded(),
      ...this.actions[2].asArrayPadded(),
      ...this.actions[3].asArrayPadded(),
      ...this.actions[4].asArrayPadded(),
      ...string_to_buffer(14, this.labels[0]),
      ...string_to_buffer(6, this.labels[1]),
      ...string_to_buffer(6, this.labels[2]),
      ...string_to_buffer(6, this.labels[3]),
      ...string_to_buffer(6, this.labels[4]),
    ]
  }
}

export class CtrlThumbstick extends CtrlSection {
  constructor(
    public override profileIndex: number,
    public override sectionIndex: SectionIndex,
    public mode: ThumbstickMode,
    public distance_mode: ThumbstickDistanceMode,
    public deadzone: number,
    public overlap : number,
    public deadzone_override: boolean,
    public antideadzone: number,
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.SECTION_SHARE)
  }

  static override decode(buffer: Uint8Array) {
    // See firmware repo "ctrl.h" header, "CtrlThumbstick" struct.
    const data = Array.from(buffer)
    return new CtrlThumbstick(
      // Payload starts at index 4.
      data[4],  // ProfileIndex.
      data[5],  // SectionIndex.
      data[6],  // Mode.
      data[7],  // Distance mode.
      data[8],  // Deadzone.
      data[9] <= 128 ? data[9] : data[9]-256,  // Axis overlap (unsigned to signed).
      Boolean(data[10]),  // Deadzone override.
      data[11],  // Antideadzone.
    )
  }

  override payload() {
    return [
      this.profileIndex,
      this.sectionIndex,
      Number(this.mode),
      Number(this.distance_mode),
      this.deadzone,
      this.overlap,
      Number(this.deadzone_override),
      this.antideadzone,
    ]
  }
}

export class CtrlGyro extends CtrlSection {
  constructor(
    public override profileIndex: number,
    public override sectionIndex: SectionIndex,
    public mode: GyroMode,
    public engage: number,
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.SECTION_SHARE)
  }

  static override decode(buffer: Uint8Array) {
    const data = Array.from(buffer)
    return new CtrlGyro(
      data[4],  // ProfileIndex.
      data[5],  // SectionIndex.
      data[6],  // Gyro mode.
      data[7],  // Engage button.
    )
  }

  override payload() {
    return [
      this.profileIndex,
      this.sectionIndex,
      Number(this.mode),
      Number(this.engage),
    ]
  }
}

export class CtrlGyroAxis extends CtrlSection {
  constructor(
    public override profileIndex: number,
    public override sectionIndex: SectionIndex,
    public actions: ActionGroup[] = Array(2).fill(ActionGroup.empty(4)),
    public minAngle = 0,
    public maxAngle = 0,
    public labels: string[]
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.SECTION_SHARE)
  }

  static default() {
    return new CtrlGyroAxis(0, 0, Array(2).fill(ActionGroup.empty(4)), 0, 0, [])
  }

  static override decode(buffer: Uint8Array) {
    const data = Array.from(buffer)
    return new CtrlGyroAxis(
      data[4],  // ProfileIndex.
      data[5],  // SectionIndex.
      [
        new ActionGroup(data.slice(6, 10)),   // Action negative.
        new ActionGroup(data.slice(10, 14)),  // Action positive.
      ],
      data[14] <= 128 ? data[14] : data[14]-256,  // Min angle (nnsigned to signed).
      data[15] <= 128 ? data[15] : data[15]-256,  // Max angle (nnsigned to signed).
      [
        string_from_slice(buffer, 16, 30),  // Label negative.
        string_from_slice(buffer, 30, 48),  // Label positive.
      ]
    )
  }

  override payload() {
    return [
      this.profileIndex,
      this.sectionIndex,
      ...this.actions[0].asArrayPadded(),
      ...this.actions[1].asArrayPadded(),
      this.minAngle,
      this.maxAngle,
      ...string_to_buffer(14, this.labels[0]),
      ...string_to_buffer(14, this.labels[1]),
    ]
  }
}

export class CtrlStatusGet extends Ctrl {
  constructor(
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.STATUS_GET)
  }
}

export class CtrlStatusSet extends Ctrl {
  constructor(
    public time: number
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.STATUS_SET)
  }

  override payload() {
    return uint64_to_uint8_array(BigInt(this.time), true)
  }
}

export class CtrlStatusShare extends Ctrl {
  constructor(
    public version: number[],
  ) {
    super(1, DeviceId.ALPAKKA, MessageType.STATUS_SHARE)
  }

  static override decode(buffer: Uint8Array) {
    const data = Array.from(buffer)
    const version: number[] = []
    version[0] = data[4]  // Payload starts at index 4.
    version[1] = data[5]
    version[2] = data[6]
    return new CtrlStatusShare(version)
  }
}

export class CtrlHome extends CtrlButton {}
