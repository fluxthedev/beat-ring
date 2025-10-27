"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface KitSelectorProps {
  selectedKit: string
  kits: string[]
  onKitChange: (kit: string) => void
}

export function KitSelector({ selectedKit, kits, onKitChange }: KitSelectorProps) {
  return (
    <div className="grid gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Drum Kit</span>
      </div>
      <Select value={selectedKit} onValueChange={onKitChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a kit" />
        </SelectTrigger>
        <SelectContent>
          {kits.map((kitName) => (
            <SelectItem key={kitName} value={kitName}>
              {kitName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
