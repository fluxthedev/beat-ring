"use client"

import { Slider } from "@/components/ui/slider"

interface SwingControlProps {
  swing: number
  onSwingChange: (value: number) => void
}

export function SwingControl({ swing, onSwingChange }: SwingControlProps) {
  return (
    <div className="grid gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Swing: {swing}%</span>
      </div>
      <Slider value={[swing]} min={0} max={50} step={1} onValueChange={(value) => onSwingChange(value[0])} />
    </div>
  )
}
