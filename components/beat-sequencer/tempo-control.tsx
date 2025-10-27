"use client"

import { Slider } from "@/components/ui/slider"

interface TempoControlProps {
  tempo: number
  onTempoChange: (value: number) => void
}

export function TempoControl({ tempo, onTempoChange }: TempoControlProps) {
  return (
    <div className="grid gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Tempo: {tempo} BPM</span>
      </div>
      <Slider value={[tempo]} min={60} max={200} step={1} onValueChange={(value) => onTempoChange(value[0])} />
    </div>
  )
}
