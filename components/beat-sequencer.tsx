"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import * as Tone from "tone"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Undo2, Play, Pause, Trash2, Save, Upload, Download } from "lucide-react"
import { useTheme } from "next-themes"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/hooks/use-toast"

// Define the sound samples
const SAMPLES = [
  { name: "Kick", url: "https://cdn.freesound.org/previews/171/171104_2394245-lq.mp3", key: "A" },
  { name: "Snare", url: "https://cdn.freesound.org/previews/387/387186_7255534-lq.mp3", key: "B" },
  { name: "Hi-hat", url: "https://cdn.freesound.org/previews/436/436695_9018154-lq.mp3", key: "C" },
  { name: "Clap", url: "https://cdn.freesound.org/previews/215/215617_1979597-lq.mp3", key: "D" },
  { name: "Tom", url: "https://cdn.freesound.org/previews/131/131347_2398403-lq.mp3", key: "E" },
]

// Define colors for each track
const TRACK_COLORS = [
  "rgb(239, 68, 68)", // red
  "rgb(249, 115, 22)", // orange
  "rgb(59, 130, 246)", // blue
  "rgb(16, 185, 129)", // green
  "rgb(168, 85, 247)", // purple
]

// Define the number of steps in the sequencer
const STEPS = 16

// Define the initial tempo
const INITIAL_TEMPO = 110

// Define the initial pattern (empty)
const INITIAL_PATTERN = Array(SAMPLES.length)
  .fill(null)
  .map(() => Array(STEPS).fill(false))

export function BeatSequencer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tempo, setTempo] = useState(INITIAL_TEMPO)
  const [swing, setSwing] = useState(0)
  const [metronome, setMetronome] = useState(false)
  const [quantize, setQuantize] = useState(true)
  const [pattern, setPattern] = useState<boolean[][]>(INITIAL_PATTERN)
  const [history, setHistory] = useState<boolean[][][]>([INITIAL_PATTERN])
  const [historyIndex, setHistoryIndex] = useState(0)
  const { theme } = useTheme()
  const { toast } = useToast()

  // References for audio elements
  const samplerRef = useRef<Tone.Sampler | null>(null)
  const metronomeRef = useRef<Tone.Player | null>(null)
  const sequencerRef = useRef<Tone.Sequence | null>(null)

  // Initialize Tone.js and load samples
  useEffect(() => {
    // Create a sampler for all our sounds
    const sampler = new Tone.Players({
      kick: SAMPLES[0].url,
      snare: SAMPLES[1].url,
      hihat: SAMPLES[2].url,
      clap: SAMPLES[3].url,
      tom: SAMPLES[4].url,
      metronome: "https://cdn.freesound.org/previews/320/320181_5260872-lq.mp3",
    }).toDestination()

    samplerRef.current = sampler
    metronomeRef.current = sampler.player("metronome")

    // Create a sequence
    const sequence = new Tone.Sequence(
      (time, step) => {
        setCurrentStep(step)

        // Play sounds for this step
        pattern.forEach((track, trackIndex) => {
          if (track[step]) {
            const soundName = ["kick", "snare", "hihat", "clap", "tom"][trackIndex]
            sampler.player(soundName).start(time)
          }
        })

        // Play metronome on first beat of each bar (every 4 steps)
        if (metronome && step % 4 === 0) {
          metronomeRef.current?.start(time)
        }
      },
      Array.from({ length: STEPS }, (_, i) => i),
      "16n",
    )

    sequencerRef.current = sequence

    // Set the swing
    Tone.Transport.swing = swing / 100

    // Set the tempo
    Tone.Transport.bpm.value = tempo

    return () => {
      sequence.dispose()
      sampler.dispose()
    }
  }, [pattern, metronome, swing, tempo])

  // Update swing when it changes
  useEffect(() => {
    Tone.Transport.swing = swing / 100
  }, [swing])

  // Update tempo when it changes
  useEffect(() => {
    Tone.Transport.bpm.value = tempo
  }, [tempo])

  // Handle play/pause
  const togglePlay = async () => {
    if (!isPlaying) {
      // Start audio context if it's not started
      await Tone.start()
      Tone.Transport.start()
      sequencerRef.current?.start(0)
      setIsPlaying(true)
    } else {
      Tone.Transport.pause()
      setIsPlaying(false)
    }
  }

  // Handle clear
  const handleClear = () => {
    const newPattern = Array(SAMPLES.length)
      .fill(null)
      .map(() => Array(STEPS).fill(false))

    setPattern(newPattern)
    addToHistory(newPattern)
  }

  // Handle undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setPattern(history[newIndex])
    }
  }

  // Add to history
  const addToHistory = (newPattern: boolean[][]) => {
    const newHistory = [...history.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(newPattern))]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Toggle a step in the pattern
  const toggleStep = (trackIndex: number, stepIndex: number) => {
    const newPattern = [...pattern]
    newPattern[trackIndex] = [...pattern[trackIndex]]
    newPattern[trackIndex][stepIndex] = !newPattern[trackIndex][stepIndex]

    setPattern(newPattern)
    addToHistory(newPattern)

    // If we're not playing, play the sound immediately for feedback
    if (!isPlaying) {
      const soundName = ["kick", "snare", "hihat", "clap", "tom"][trackIndex]
      samplerRef.current?.player(soundName).start()
    }
  }

  // Save pattern as JSON
  const savePattern = () => {
    const data = {
      pattern,
      tempo,
      swing,
      metronome,
      quantize,
    }

    // Create a data URL
    const jsonString = JSON.stringify(data)
    const dataUrl = `data:text/json;charset=utf-8,${encodeURIComponent(jsonString)}`

    // Create a link and trigger download
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = "beat-pattern.json"
    link.click()

    toast({
      title: "Pattern saved",
      description: "Your beat pattern has been saved as a JSON file.",
    })
  }

  // Load pattern from JSON
  const loadPattern = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        setPattern(data.pattern)
        setTempo(data.tempo || INITIAL_TEMPO)
        setSwing(data.swing || 0)
        setMetronome(data.metronome || false)
        setQuantize(data.quantize || true)

        // Reset history with this new pattern
        setHistory([data.pattern])
        setHistoryIndex(0)

        toast({
          title: "Pattern loaded",
          description: "Your beat pattern has been loaded successfully.",
        })
      } catch (error) {
        toast({
          title: "Error loading pattern",
          description: "The file could not be parsed as a valid pattern.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)

    // Reset the input
    event.target.value = ""
  }

  // Share pattern via URL
  const sharePattern = () => {
    const data = {
      pattern,
      tempo,
      swing,
      metronome,
      quantize,
    }

    // Create a compressed URL parameter
    const jsonString = JSON.stringify(data)
    const compressedData = btoa(jsonString)
    const url = `${window.location.origin}${window.location.pathname}?pattern=${encodeURIComponent(compressedData)}`

    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "URL copied to clipboard",
        description: "Share this URL to let others play your beat pattern.",
      })
    })
  }

  // Load pattern from URL parameter on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const patternParam = params.get("pattern")

    if (patternParam) {
      try {
        const jsonString = atob(decodeURIComponent(patternParam))
        const data = JSON.parse(jsonString)

        setPattern(data.pattern)
        setTempo(data.tempo || INITIAL_TEMPO)
        setSwing(data.swing || 0)
        setMetronome(data.metronome || false)
        setQuantize(data.quantize || true)

        // Reset history with this new pattern
        setHistory([data.pattern])
        setHistoryIndex(0)

        toast({
          title: "Pattern loaded from URL",
          description: "A shared beat pattern has been loaded.",
        })
      } catch (error) {
        console.error("Error loading pattern from URL", error)
      }
    }
  }, [])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase()
      const trackIndex = SAMPLES.findIndex((sample) => sample.key === key)

      if (trackIndex !== -1) {
        // Play the sound
        const soundName = ["kick", "snare", "hihat", "clap", "tom"][trackIndex]
        samplerRef.current?.player(soundName).start()

        // If we're playing, add to the current step
        if (isPlaying && quantize) {
          toggleStep(trackIndex, currentStep)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlaying, currentStep, quantize])

  // Draw the sequencer on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Get the canvas dimensions
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    // Calculate radius
    const radius = Math.min(centerX, centerY) * 0.8

    // Clear the canvas
    ctx.clearRect(0, 0, width, height)

    // Draw the background
    ctx.fillStyle = theme === "dark" ? "#1a1a1a" : "#f5f5f5"
    ctx.fillRect(0, 0, width, height)

    // Draw the outer circle
    ctx.strokeStyle = theme === "dark" ? "#333" : "#ddd"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Draw step markers
    for (let i = 0; i < STEPS; i++) {
      const angle = (i / STEPS) * Math.PI * 2 - Math.PI / 2

      // Draw step marker lines
      ctx.strokeStyle = i % 4 === 0 ? (theme === "dark" ? "#666" : "#999") : theme === "dark" ? "#333" : "#ddd"
      ctx.lineWidth = i % 4 === 0 ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
      ctx.stroke()

      // Draw step numbers
      ctx.fillStyle = theme === "dark" ? "#999" : "#666"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      const textRadius = radius * 1.1
      ctx.fillText((i + 1).toString(), centerX + Math.cos(angle) * textRadius, centerY + Math.sin(angle) * textRadius)
    }

    // Draw tracks (concentric circles)
    for (let trackIndex = 0; trackIndex < SAMPLES.length; trackIndex++) {
      const trackRadius = radius * (0.9 - trackIndex * 0.15)

      // Draw track circle
      ctx.strokeStyle = theme === "dark" ? "#444" : "#ccc"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(centerX, centerY, trackRadius, 0, Math.PI * 2)
      ctx.stroke()

      // Draw track name
      ctx.fillStyle = TRACK_COLORS[trackIndex]
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(`${SAMPLES[trackIndex].name} (${SAMPLES[trackIndex].key})`, centerX, centerY - trackRadius)

      // Draw steps for this track
      for (let stepIndex = 0; stepIndex < STEPS; stepIndex++) {
        const angle = (stepIndex / STEPS) * Math.PI * 2 - Math.PI / 2
        const x = centerX + Math.cos(angle) * trackRadius
        const y = centerY + Math.sin(angle) * trackRadius

        // Draw step
        if (pattern[trackIndex][stepIndex]) {
          // Active step
          ctx.fillStyle = TRACK_COLORS[trackIndex]
          ctx.beginPath()
          ctx.arc(x, y, 10, 0, Math.PI * 2)
          ctx.fill()

          // Add highlight effect if this is the current step and we're playing
          if (isPlaying && stepIndex === currentStep) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
            ctx.beginPath()
            ctx.arc(x, y, 14, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          // Inactive step
          ctx.fillStyle = theme === "dark" ? "#333" : "#ddd"
          ctx.beginPath()
          ctx.arc(x, y, 8, 0, Math.PI * 2)
          ctx.fill()

          // Draw outline
          ctx.strokeStyle = TRACK_COLORS[trackIndex]
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(x, y, 8, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    // Draw playhead
    if (isPlaying) {
      const angle = (currentStep / STEPS) * Math.PI * 2 - Math.PI / 2

      // Draw line from center to edge
      ctx.strokeStyle = theme === "dark" ? "#fff" : "#000"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
      ctx.stroke()

      // Draw circle at the end
      ctx.fillStyle = theme === "dark" ? "#fff" : "#000"
      ctx.beginPath()
      ctx.arc(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [pattern, currentStep, isPlaying, theme])

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Get click coordinates relative to canvas
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate center and radius
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const maxRadius = Math.min(centerX, centerY) * 0.8

    // Calculate distance from center and angle
    const dx = x - centerX
    const dy = y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Calculate angle (0 is at the top, going clockwise)
    let angle = Math.atan2(dy, dx) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2

    // Calculate step index from angle
    const stepIndex = Math.floor((angle / (Math.PI * 2)) * STEPS) % STEPS

    // Calculate track index from distance
    for (let trackIndex = 0; trackIndex < SAMPLES.length; trackIndex++) {
      const trackRadius = maxRadius * (0.9 - trackIndex * 0.15)
      const radiusMin = trackRadius - 15
      const radiusMax = trackRadius + 15

      if (distance >= radiusMin && distance <= radiusMax) {
        // Toggle this step
        toggleStep(trackIndex, stepIndex)
        break
      }
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-4xl">
      <div className="relative mb-4">
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="w-full max-w-[600px] h-auto cursor-pointer"
          onClick={handleCanvasClick}
        />
      </div>

      <div className="w-full max-w-[600px] grid gap-6">
        {/* Main controls */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={togglePlay} className="flex items-center gap-2">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>

          <Button onClick={handleUndo} variant="outline" disabled={historyIndex === 0}>
            <Undo2 className="h-4 w-4 mr-2" />
            Undo
          </Button>

          <Button onClick={handleClear} variant="outline">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>

          <Button onClick={savePattern} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button onClick={sharePattern} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Share URL
          </Button>

          <div className="relative">
            <Button variant="outline" as="label" htmlFor="load-pattern" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Load
            </Button>
            <input id="load-pattern" type="file" accept=".json" className="sr-only" onChange={loadPattern} />
          </div>

          <ThemeToggle />
        </div>

        {/* Tempo control */}
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Tempo: {tempo} BPM</span>
          </div>
          <Slider value={[tempo]} min={60} max={200} step={1} onValueChange={(value) => setTempo(value[0])} />
        </div>

        {/* Swing control */}
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Swing: {swing}%</span>
          </div>
          <Slider value={[swing]} min={0} max={50} step={1} onValueChange={(value) => setSwing(value[0])} />
        </div>

        {/* Toggle controls */}
        <div className="flex flex-wrap gap-6 justify-center">
          <div className="flex items-center space-x-2">
            <Switch id="metronome" checked={metronome} onCheckedChange={setMetronome} />
            <label htmlFor="metronome" className="text-sm font-medium">
              Metronome
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="quantize" checked={quantize} onCheckedChange={setQuantize} />
            <label htmlFor="quantize" className="text-sm font-medium">
              Quantize
            </label>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground mt-4">
          <p className="mb-2">
            <strong>Instructions:</strong> Click on the circles to add/remove beats. Press keyboard keys (A-E) to
            trigger sounds.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SAMPLES.map((sample, index) => (
              <div key={index} className="flex items-center gap-2">
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
