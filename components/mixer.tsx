"use client"

import type React from "react"
import { Slider } from "@/components/ui/slider"

import { Switch } from "@/components/ui/switch"

// Define the shape of the props
interface MixerProps {
  trackSettings: {
    volume: number
    pitch: number
    reverb: number
    delay: number
    noise: number
    effectsOn: boolean
  }[]
  handleTrackSettingChange: (
    trackIndex: number,
    setting: "volume" | "pitch" | "reverb" | "delay" | "noise" | "effectsOn",
    value: number | boolean,
  ) => void
  samples: ReadonlyArray<{ name: string; key: string }>
  trackColors: ReadonlyArray<string>
}

export function Mixer({ trackSettings, handleTrackSettingChange, samples, trackColors }: MixerProps) {
  return (
    <div className="grid gap-6 mt-4">
      <h2 className="text-xl font-bold text-center">Mixer</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {samples.map((sample, trackIndex) => (
          <div key={trackIndex} className="grid gap-3 p-4 rounded-lg" style={{ backgroundColor: `${trackColors[trackIndex]}33` }}>
            <span className="text-sm font-bold" style={{ color: trackColors[trackIndex] }}>
              {sample.name}
            </span>
            <div className="grid gap-1">
              <label className="text-xs">Volume</label>
              <Slider
                value={[trackSettings[trackIndex].volume]}
                min={-24}
                max={6}
                step={1}
                onValueChange={(value) => handleTrackSettingChange(trackIndex, "volume", value[0])}
              />
              <span className="text-xs text-center">{trackSettings[trackIndex].volume.toFixed(1)} dB</span>
            </div>
            <div className="grid gap-1">
              <label className="text-xs">Pitch</label>
              <Slider
                value={[trackSettings[trackIndex].pitch]}
                min={-1200}
                max={1200}
                step={50}
                onValueChange={(value) => handleTrackSettingChange(trackIndex, "pitch", value[0])}
              />
              <span className="text-xs text-center">{trackSettings[trackIndex].pitch} cents</span>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id={`effectsOn-${trackIndex}`}
                checked={trackSettings[trackIndex].effectsOn}
                onCheckedChange={(value) => handleTrackSettingChange(trackIndex, "effectsOn", value)}
                className="transform scale-125"
              />
              <label htmlFor={`effectsOn-${trackIndex}`} className="text-sm pl-2">
                Effects
              </label>
            </div>
            <div className="grid gap-1">
              <label className="text-xs">Reverb</label>
              <Slider
                value={[trackSettings[trackIndex].reverb]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(value) => handleTrackSettingChange(trackIndex, "reverb", value[0])}
                disabled={!trackSettings[trackIndex].effectsOn}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs">Echo</label>
              <Slider
                value={[trackSettings[trackIndex].delay]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(value) => handleTrackSettingChange(trackIndex, "delay", value[0])}
                disabled={!trackSettings[trackIndex].effectsOn}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs">Noise</label>
              <Slider
                value={[trackSettings[trackIndex].noise]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(value) => handleTrackSettingChange(trackIndex, "noise", value[0])}
                disabled={!trackSettings[trackIndex].effectsOn}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
