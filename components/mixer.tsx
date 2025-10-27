"use client"

import type React from "react"
import { Slider } from "@/components/ui/slider"

// Define the shape of the props
interface MixerProps {
  trackSettings: { volume: number; pitch: number }[]
  handleTrackSettingChange: (trackIndex: number, setting: "volume" | "pitch", value: number) => void
  samples: { name: string; key: string }[]
  trackColors: string[]
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
          </div>
        ))}
      </div>
    </div>
  )
}
