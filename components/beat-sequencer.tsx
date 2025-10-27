"use client"

import { AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"

import { SequencerCanvas } from "@/components/beat-sequencer/sequencer-canvas"
import { PlaybackControls } from "@/components/beat-sequencer/playback-controls"
import { TempoControl } from "@/components/beat-sequencer/tempo-control"
import { SwingControl } from "@/components/beat-sequencer/swing-control"
import { KitSelector } from "@/components/beat-sequencer/kit-selector"
import { ToggleControls } from "@/components/beat-sequencer/toggle-controls"
import { SAMPLES, TRACK_COLORS } from "@/components/beat-sequencer/constants"
import { Mixer } from "@/components/mixer"
import { ThemeToggle } from "@/components/theme-toggle"
import { useBeatSequencer } from "@/hooks/use-beat-sequencer"
import { useMobile } from "@/hooks/use-mobile"
import { KITS } from "@/lib/kits"

export function BeatSequencer() {
  const { theme } = useTheme()
  const isMobile = useMobile()

  const {
    isPlaying,
    currentStep,
    tempo,
    setTempo,
    swing,
    setSwing,
    selectedKit,
    setSelectedKit,
    metronome,
    setMetronome,
    quantize,
    setQuantize,
    pattern,
    toggleStep,
    trackSettings,
    handleTrackSettingChange,
    historyIndex,
    samplesLoaded,
    loadingError,
    togglePlay,
    handleUndo,
    handleClear,
    savePattern,
    loadPattern,
    sharePattern,
    exportWAV,
    exportMIDI,
  } = useBeatSequencer({ isMobile })

  const kitNames = Object.keys(KITS)

  return (
    <div className="flex flex-col items-center w-full max-w-4xl">
      {!samplesLoaded && (
        <div className="mb-4 p-4 bg-muted rounded-lg w-full max-w-[600px]">
          {loadingError ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p>Error initializing audio: {loadingError}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Initializing synthetic drum sounds...</p>
          )}
        </div>
      )}

      <div className="relative mb-4 w-full max-w-[800px]">
        <SequencerCanvas
          pattern={pattern}
          currentStep={currentStep}
          isPlaying={isPlaying}
          theme={theme}
          isMobile={isMobile}
          onToggleStep={toggleStep}
        />
      </div>

      <div className="w-full max-w-[800px] grid gap-6">
        <div className="flex flex-col gap-4">
          <PlaybackControls
            isPlaying={isPlaying}
            samplesLoaded={samplesLoaded}
            onTogglePlay={togglePlay}
            onUndo={handleUndo}
            canUndo={historyIndex > 0}
            onClear={handleClear}
            onSave={savePattern}
            onShare={sharePattern}
            onLoad={loadPattern}
            onExportWav={exportWAV}
            onExportMidi={exportMIDI}
          />
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        </div>

        <TempoControl tempo={tempo} onTempoChange={setTempo} />
        <SwingControl swing={swing} onSwingChange={setSwing} />
        <KitSelector selectedKit={selectedKit} kits={kitNames} onKitChange={setSelectedKit} />

        <ToggleControls
          metronome={metronome}
          quantize={quantize}
          onMetronomeChange={setMetronome}
          onQuantizeChange={setQuantize}
        />

        <Mixer
          trackSettings={trackSettings}
          handleTrackSettingChange={handleTrackSettingChange}
          samples={SAMPLES}
          trackColors={TRACK_COLORS}
        />

        <div className="text-sm text-muted-foreground mt-4">
          <p className="mb-2">
            <strong>Instructions:</strong> Click on the circles to add/remove beats. Press keyboard keys (A-E) to
            trigger sounds. All sounds are generated synthetically for reliability.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SAMPLES.map((sample, index) => (
              <div key={sample.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TRACK_COLORS[index] }}></div>
                <span>
                  {sample.name} - Key {sample.key}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
