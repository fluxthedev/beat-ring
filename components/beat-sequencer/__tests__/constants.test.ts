import { describe, expect, it } from "vitest"

import {
  INITIAL_PATTERN,
  INITIAL_TRACK_SETTINGS,
  INITIAL_TEMPO,
  SAMPLES,
  STEPS,
  TRACK_COLORS,
} from "@/components/beat-sequencer/constants"

describe("beat sequencer constants", () => {
  it("provides a consistent number of samples", () => {
    expect(SAMPLES).toHaveLength(5)
    const uniqueNames = new Set(SAMPLES.map((sample) => sample.name))
    const uniqueKeys = new Set(SAMPLES.map((sample) => sample.key))

    expect(uniqueNames.size).toBe(SAMPLES.length)
    expect(uniqueKeys.size).toBe(SAMPLES.length)
  })

  it("creates an empty initial pattern for every sample", () => {
    expect(INITIAL_PATTERN).toHaveLength(SAMPLES.length)
    INITIAL_PATTERN.forEach((row) => {
      expect(row).toHaveLength(STEPS)
      row.forEach((step) => {
        expect(step).toBe(false)
      })
    })
  })

  it("configures default track settings for every sample", () => {
    expect(INITIAL_TRACK_SETTINGS).toHaveLength(SAMPLES.length)
    INITIAL_TRACK_SETTINGS.forEach((settings) => {
      expect(settings).toMatchObject({
        volume: 0,
        pitch: 0,
        reverb: 0,
        delay: 0,
        noise: 0,
        effectsOn: false,
      })
    })
  })

  it("tracks share the same number of colors as samples", () => {
    expect(TRACK_COLORS).toHaveLength(SAMPLES.length)
  })

  it("uses a musically sensible default tempo", () => {
    expect(typeof INITIAL_TEMPO).toBe("number")
    expect(INITIAL_TEMPO).toBeGreaterThanOrEqual(60)
    expect(INITIAL_TEMPO).toBeLessThanOrEqual(180)
  })
})
