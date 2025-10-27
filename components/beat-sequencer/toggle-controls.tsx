"use client"

import { Switch } from "@/components/ui/switch"

interface ToggleControlsProps {
  metronome: boolean
  quantize: boolean
  onMetronomeChange: (value: boolean) => void
  onQuantizeChange: (value: boolean) => void
}

export function ToggleControls({ metronome, quantize, onMetronomeChange, onQuantizeChange }: ToggleControlsProps) {
  return (
    <div className="flex flex-wrap gap-6 justify-center">
      <div className="flex items-center space-x-2">
        <Switch id="metronome" checked={metronome} onCheckedChange={onMetronomeChange} />
        <label htmlFor="metronome" className="text-sm font-medium">
          Metronome
        </label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="quantize" checked={quantize} onCheckedChange={onQuantizeChange} />
        <label htmlFor="quantize" className="text-sm font-medium">
          Quantize
        </label>
      </div>
    </div>
  )
}
