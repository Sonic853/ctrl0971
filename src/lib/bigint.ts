// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

export function uint64_to_uint8_array(int64: bigint, littleEndian=false) {
    // Convert a 64bit integer into an array of 8x 8bit integers.
    // It cannot be done manually with bitwise operators becase these only work
    // with 32bit integers.
    const dataview = new DataView(new ArrayBuffer(8))
    dataview.setBigUint64(0, int64, littleEndian)
    return [
      dataview.getUint8(0),
      dataview.getUint8(1),
      dataview.getUint8(2),
      dataview.getUint8(3),
      dataview.getUint8(4),
      dataview.getUint8(5),
      dataview.getUint8(6),
      dataview.getUint8(7),
    ]
}

export function uint32_to_uint8_array(int32: number) {
  // Split the number using bitmasks.
  return [
    (int32 >> 0)  & 0b11111111,
    (int32 >> 8)  & 0b11111111,
    (int32 >> 16) & 0b11111111,
    (int32 >> 24) & 0b11111111,
  ]
}

export function uint8_array_to_uint32(int8: number[]) {
  return (
    int8[0] +
    (int8[1] << 8) +
    (int8[2] << 16) +
    (int8[3] << 24)
  )
}
