import { describe, expect, it } from "vitest"

import {
  base64ToUint8,
  bytesToString,
  clonePattern,
  uint8ToBase64,
} from "@/hooks/use-beat-sequencer"
import {
  INITIAL_PATTERN,
  STEPS,
} from "@/components/beat-sequencer/constants"

describe("useBeatSequencer helpers", () => {
  it("clones nested pattern arrays without sharing references", () => {
    const original = clonePattern(INITIAL_PATTERN)
    const clone = clonePattern(original)

    expect(clone).not.toBe(original)
    clone.forEach((row, index) => {
      expect(row).not.toBe(original[index])
      expect(row).toEqual(Array(STEPS).fill(false))
    })

    original[0][0] = true
    expect(clone[0][0]).toBe(false)
  })

  it("round trips base64 conversions for arbitrary binary data", () => {
    const encoder = new TextEncoder()
    const inputString = "BeatRing makes rhythms better!"
    const bytes = encoder.encode(inputString)

    const encoded = uint8ToBase64(bytes)
    const decoded = base64ToUint8(encoded)

    expect(decoded).toBeInstanceOf(Uint8Array)
    expect(decoded).toHaveLength(bytes.length)
    expect([...decoded]).toEqual([...bytes])
  })

  it("supports large byte arrays when encoding to base64", () => {
    const large = new Uint8Array(0x9000)
    for (let index = 0; index < large.length; index += 1) {
      large[index] = index % 256
    }

    const encoded = uint8ToBase64(large)
    const decoded = base64ToUint8(encoded)

    expect(decoded).toHaveLength(large.length)
    expect([...decoded]).toEqual([...large])
  })

  it("converts bytes back to human readable strings", () => {
    const encoder = new TextEncoder()
    const original = "swing=56"
    const bytes = encoder.encode(original)

    expect(bytesToString(bytes)).toBe(original)
  })
})
