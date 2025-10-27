export const SAMPLES = [
  { name: "Kick", key: "A" },
  { name: "Snare", key: "B" },
  { name: "Hi-hat", key: "C" },
  { name: "Clap", key: "D" },
  { name: "Tom", key: "E" },
] as const

export const TRACK_COLORS = [
  "rgb(239, 68, 68)",
  "rgb(249, 115, 22)",
  "rgb(59, 130, 246)",
  "rgb(16, 185, 129)",
  "rgb(168, 85, 247)",
] as const

export const STEPS = 16

export const INITIAL_TEMPO = 110

export const INITIAL_PATTERN = Array(SAMPLES.length)
  .fill(null)
  .map(() => Array(STEPS).fill(false))

export interface TrackSettings {
  volume: number
  pitch: number
  reverb: number
  delay: number
  noise: number
  effectsOn: boolean
}

export const INITIAL_TRACK_SETTINGS: TrackSettings[] = SAMPLES.map(() => ({
  volume: 0,
  pitch: 0,
  reverb: 0,
  delay: 0,
  noise: 0,
  effectsOn: false,
}))
