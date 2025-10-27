"use client"

import type { ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { FileAudio, Music, Pause, Play, Trash2, Undo2, Save, Upload, Download } from "lucide-react"

interface PlaybackControlsProps {
  isPlaying: boolean
  samplesLoaded: boolean
  onTogglePlay: () => void
  onUndo: () => void
  canUndo: boolean
  onClear: () => void
  onSave: () => void
  onShare: () => void
  onLoad: (event: ChangeEvent<HTMLInputElement>) => void
  onExportWav: () => void
  onExportMidi: () => void
}

export function PlaybackControls({
  isPlaying,
  samplesLoaded,
  onTogglePlay,
  onUndo,
  canUndo,
  onClear,
  onSave,
  onShare,
  onLoad,
  onExportWav,
  onExportMidi,
}: PlaybackControlsProps) {
  return (
    <div className="flex flex-wrap gap-4 justify-center">
      <Button onClick={onTogglePlay} className="flex items-center gap-2 p-6 text-lg" disabled={!samplesLoaded}>
        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        {isPlaying ? "Pause" : "Play"}
      </Button>

      <Button onClick={onUndo} variant="outline" className="p-4 text-md" disabled={!canUndo}>
        <Undo2 className="h-5 w-5 mr-2" />
        Undo
      </Button>

      <Button onClick={onClear} variant="outline" className="p-4 text-md">
        <Trash2 className="h-5 w-5 mr-2" />
        Clear
      </Button>

      <Button onClick={onSave} variant="outline" className="p-4 text-md">
        <Save className="h-5 w-5 mr-2" />
        Save
      </Button>

      <Button onClick={onShare} variant="outline" className="p-4 text-md">
        <Download className="h-5 w-5 mr-2" />
        Share URL
      </Button>

      <div className="relative">
        <Button variant="outline" asChild className="cursor-pointer p-4 text-md">
          <label htmlFor="load-pattern" className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Load
          </label>
        </Button>
        <input id="load-pattern" type="file" accept=".json" className="sr-only" onChange={onLoad} />
      </div>

      <Button onClick={onExportWav} variant="outline" className="p-4 text-md">
        <FileAudio className="h-5 w-5 mr-2" />
        Export WAV
      </Button>

      <Button onClick={onExportMidi} variant="outline" className="p-4 text-md">
        <Music className="h-5 w-5 mr-2" />
        Export MIDI
      </Button>
    </div>
  )
}
