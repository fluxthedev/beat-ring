"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import * as Tone from "tone"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Undo2, Play, Pause, Trash2, Save, Upload, Download, AlertCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileAudio, Music } from "lucide-react"
import { KITS } from "@/lib/kits"
import { Mixer } from "./mixer"

// Define the sound samples
const SAMPLES = [
  { name: "Kick", key: "A" },
  { name: "Snare", key: "B" },
  { name: "Hi-hat", key: "C" },
  { name: "Clap", key: "D" },
  { name: "Tom", key: "E" },
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

interface TrackSettings {
  volume: number
  pitch: number
}

const INITIAL_TRACK_SETTINGS: TrackSettings[] = SAMPLES.map(() => ({
  volume: 0, // 0 dB
  pitch: 0, // 0 cents offset
}))

export function BeatSequencer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tempo, setTempo] = useState(INITIAL_TEMPO)
  const [swing, setSwing] = useState(0)
  const [selectedKit, setSelectedKit] = useState("Default")
  const [metronome, setMetronome] = useState(false)
  const [quantize, setQuantize] = useState(true)
  const [pattern, setPattern] = useState<boolean[][]>(INITIAL_PATTERN)
  const [trackSettings, setTrackSettings] = useState<TrackSettings[]>(INITIAL_TRACK_SETTINGS)
  const [history, setHistory] = useState<boolean[][][]>([INITIAL_PATTERN])
  const [historyIndex, setHistoryIndex] = useState(0)
  const { theme } = useTheme()
  const { toast } = useToast()
  const isMobile = useMobile()
  const touchStartedRef = useRef(false)

  // References for audio elements
  const synthsRef = useRef<Record<string, any>>({})
  const sequencerRef = useRef<Tone.Sequence | null>(null)
  const [samplesLoaded, setSamplesLoaded] = useState(false)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  // Update swing when it changes
  useEffect(() => {
    Tone.Transport.swing = swing / 100
    Tone.Transport.swingSubdivision = "16n"
  }, [swing])

  // Update tempo when it changes
  useEffect(() => {
    Tone.Transport.bpm.value = tempo
  }, [tempo])

  // Update synth settings when they change
  useEffect(() => {
    if (!samplesLoaded) return

    const kit = KITS[selectedKit as keyof typeof KITS]

    trackSettings.forEach((settings, trackIndex) => {
      const sampleInfo = SAMPLES[trackIndex]
      const soundName = sampleInfo.name.toLowerCase()
      const synth = synthsRef.current[soundName]

      if (synth) {
        // Update volume
        synth.volume.value = settings.volume

        // Update pitch
        const pitchInCents = settings.pitch

        if (synth.detune) {
          // This works for MembraneSynth, MetalSynth, and most other synths
          synth.detune.value = pitchInCents
        } else if (synth instanceof Tone.NoiseSynth) {
          // For NoiseSynth, we adjust playbackRate as it doesn't have a detune property.
          const sampleName = sampleInfo.name as keyof typeof kit
          const kitSound = kit[sampleName]
          // @ts-ignore
          const initialPlaybackRate = kitSound?.options?.noise?.playbackRate || 1
          // Calculate playback rate from cents. 1200 cents = 1 octave = 2x playback rate.
          synth.noise.playbackRate = initialPlaybackRate * 2 ** (pitchInCents / 1200)
        }
      }
    })
  }, [trackSettings, samplesLoaded, selectedKit])

  // Initialize Tone.js and create synthetic drum sounds
  useEffect(() => {
    // When the kit changes, we need to reset the samples loaded flag
    setSamplesLoaded(false)
    setTrackSettings(INITIAL_TRACK_SETTINGS)

    let mounted = true

    const initializeAudio = async () => {
      try {
        // Ensure we're in a browser environment
        if (typeof window === "undefined") {
          throw new Error("Audio initialization requires browser environment")
        }

        // Set initial transport values
        Tone.Transport.bpm.value = tempo
        Tone.Transport.swing = swing / 100

        // Create synthetic drum sounds using Tone.js with error handling
        const synths: Record<string, any> = {}
        const kit = KITS[selectedKit as keyof typeof KITS]

        try {
          SAMPLES.forEach((sample) => {
            const soundName = sample.name.toLowerCase()
            const kitSound = kit[sample.name as keyof typeof kit]
            if (kitSound) {
              const SynthClass = Tone[kitSound.type as keyof typeof Tone]
              if (SynthClass) {
                synths[soundName] = new SynthClass(kitSound.options).toDestination()
              }
            }
          })

          // Metronome - simple sine wave
          synths.metronome = new Tone.Synth({
            oscillator: {
              type: "sine",
            },
            envelope: {
              attack: 0.001,
              decay: 0.1,
              sustain: 0.01,
              release: 0.1,
            },
          }).toDestination()
        } catch (synthError) {
          console.error("Error creating synthesizers:", synthError)
          throw new Error("Failed to create audio synthesizers")
        }

        if (!mounted) return

        synthsRef.current = synths

        try {
          // Create a sequence with error handling
          const sequence = new Tone.Sequence(
            (time, step) => {
              if (!mounted) return

              setCurrentStep(step)

              // Play sounds for this step
              pattern.forEach((track, trackIndex) => {
                if (track[step]) {
                  const soundName = SAMPLES[trackIndex].name.toLowerCase()
                  const synth = synthsRef.current[soundName]
                  if (synth) {
                    try {
                      if (soundName === "kick") {
                        synth.triggerAttackRelease("C1", "8n", time)
                      } else if (soundName === "snare") {
                        synth.triggerAttackRelease("8n", time)
                      } else if (soundName === "hi-hat") {
                        synth.triggerAttackRelease("32n", time)
                      } else if (soundName === "clap") {
                        synth.triggerAttackRelease("8n", time)
                      } else if (soundName === "tom") {
                        synth.triggerAttackRelease("G2", "8n", time)
                      }
                    } catch (playError) {
                      console.warn(`Error playing ${soundName}:`, playError)
                    }
                  }
                }
              })

              // Play metronome on first beat of each bar (every 4 steps)
              if (metronome && step % 4 === 0) {
                const metronomesynth = synthsRef.current["metronome"]
                if (metronomesynth) {
                  try {
                    metronomesynth.triggerAttackRelease("C5", "32n", time)
                  } catch (metronomeError) {
                    console.warn("Error playing metronome:", metronomeError)
                  }
                }
              }
            },
            Array.from({ length: STEPS }, (_, i) => i),
            "16n",
          )

          sequencerRef.current = sequence
        } catch (sequenceError) {
          console.error("Error creating sequence:", sequenceError)
          throw new Error("Failed to create audio sequence")
        }

        setSamplesLoaded(true)
        setLoadingError(null)
      } catch (error) {
        if (!mounted) return
        console.error("Error initializing audio:", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to initialize audio"
        setLoadingError(errorMessage)

        // Still set samplesLoaded to true so the UI is usable, just without audio
        setSamplesLoaded(true)
      }
    }

    initializeAudio()

    return () => {
      mounted = false

      // Proper cleanup order
      if (Tone.Transport.state === "started") {
        Tone.Transport.stop()
      }

      if (sequencerRef.current && sequencerRef.current.state === "started") {
        sequencerRef.current.stop()
      }

      if (sequencerRef.current) {
        sequencerRef.current.dispose()
      }

      // Dispose all synths
      Object.values(synthsRef.current).forEach((synth) => {
        if (synth && synth.dispose) {
          synth.dispose()
        }
      })
    }
  }, [selectedKit])

  // Separate useEffect to update the sequence callback when pattern or metronome changes
  useEffect(() => {
    if (sequencerRef.current && samplesLoaded) {
      try {
        // Update the sequence callback
        sequencerRef.current.callback = (time, step) => {
          setCurrentStep(step)

          // Play sounds for this step
          pattern.forEach((track, trackIndex) => {
            if (track[step]) {
              const soundName = SAMPLES[trackIndex].name.toLowerCase()
              const synth = synthsRef.current[soundName]
              if (synth) {
                try {
                  if (soundName === "kick") {
                    synth.triggerAttackRelease("C1", "8n", time)
                  } else if (soundName === "snare") {
                    synth.triggerAttackRelease("8n", time)
                  } else if (soundName === "hi-hat") {
                    synth.triggerAttackRelease("32n", time)
                  } else if (soundName === "clap") {
                    synth.triggerAttackRelease("8n", time)
                  } else if (soundName === "tom") {
                    synth.triggerAttackRelease("G2", "8n", time)
                  }
                } catch (playError) {
                  console.warn(`Error playing ${soundName}:`, playError)
                }
              }
            }
          })

          // Play metronome on first beat of each bar (every 4 steps)
          if (metronome && step % 4 === 0) {
            const metronomesynth = synthsRef.current["metronome"]
            if (metronomesynth) {
              try {
                metronomesynth.triggerAttackRelease("C5", "32n", time)
              } catch (metronomeError) {
                console.warn("Error playing metronome:", metronomeError)
              }
            }
          }
        }
      } catch (callbackError) {
        console.error("Error updating sequence callback:", callbackError)
      }
    }
  }, [pattern, metronome, samplesLoaded])

  // Handle play/pause
  const togglePlay = async () => {
    if (!samplesLoaded) {
      toast({
        title: "Audio not ready",
        description: "Please wait for audio to initialize.",
        variant: "destructive",
      })
      return
    }

    if (!isPlaying) {
      try {
        // Start audio context if it's not started
        if (Tone.context.state !== "running") {
          try {
            await Tone.start()
          } catch (contextError) {
            console.error("Error starting audio context:", contextError)
            toast({
              title: "Audio Context Error",
              description: "Could not start audio. Try clicking play again.",
              variant: "destructive",
            })
            return
          }
        }

        // Start the sequence and transport
        if (sequencerRef.current && sequencerRef.current.state !== "started") {
          try {
            sequencerRef.current.start(0)
          } catch (sequenceError) {
            console.error("Error starting sequence:", sequenceError)
            toast({
              title: "Sequence Error",
              description: "Could not start the beat sequence.",
              variant: "destructive",
            })
            return
          }
        }

        if (Tone.Transport.state !== "started") {
          try {
            Tone.Transport.start()
          } catch (transportError) {
            console.error("Error starting transport:", transportError)
            toast({
              title: "Transport Error",
              description: "Could not start the audio transport.",
              variant: "destructive",
            })
            return
          }
        }

        setIsPlaying(true)
      } catch (error) {
        console.error("Error starting playback:", error)
        toast({
          title: "Playback error",
          description: "There was an error starting playback.",
          variant: "destructive",
        })
      }
    } else {
      try {
        // Stop transport and sequence
        if (Tone.Transport.state === "started") {
          Tone.Transport.pause()
        }
        setIsPlaying(false)
      } catch (error) {
        console.error("Error stopping playback:", error)
        setIsPlaying(false) // Force stop the UI state
      }
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
    if (!isPlaying && samplesLoaded) {
      const soundName = SAMPLES[trackIndex].name.toLowerCase()
      const synth = synthsRef.current[soundName]
      if (synth) {
        if (soundName === "kick") {
          synth.triggerAttackRelease("C1", "8n")
        } else if (soundName === "snare") {
          synth.triggerAttackRelease("8n")
        } else if (soundName === "hi-hat") {
          synth.triggerAttackRelease("32n")
        } else if (soundName === "clap") {
          synth.triggerAttackRelease("8n")
        } else if (soundName === "tom") {
          synth.triggerAttackRelease("G2", "8n")
        }
      }
    }

    // Provide haptic feedback on mobile devices if supported
    if (isMobile && "vibrate" in navigator) {
      try {
        navigator.vibrate(50) // Short vibration for feedback
      } catch (e) {
        // Ignore errors if vibration is not supported
      }
    }
  }

  // Save pattern as JSON
  const savePattern = () => {
    const data = {
      pattern,
      tempo,
      swing,
      selectedKit,
      metronome,
      quantize,
      trackSettings,
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
        setSelectedKit(data.selectedKit || "Default")
        setMetronome(data.metronome || false)
        setQuantize(data.quantize || true)
        setTrackSettings(data.trackSettings || INITIAL_TRACK_SETTINGS)

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

  const handleTrackSettingChange = useCallback((trackIndex: number, setting: keyof TrackSettings, value: number) => {
    setTrackSettings((prevSettings) => {
      const newSettings = [...prevSettings]
      newSettings[trackIndex] = { ...newSettings[trackIndex], [setting]: value }
      return newSettings
    })
  }, [])

  // Share pattern via URL
  const sharePattern = () => {
    const data = {
      pattern,
      tempo,
      swing,
      selectedKit,
      metronome,
      quantize,
      trackSettings,
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

  // Export pattern as WAV audio
  const exportWAV = async () => {
    if (!samplesLoaded) {
      toast({
        title: "Audio not ready",
        description: "Please wait for audio to initialize before exporting.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create offline audio context for rendering
      const sampleRate = 44100
      const duration = (60 / tempo) * 4 * (STEPS / 4) // Duration for one full loop
      const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate)

      // Calculate timing
      const stepDuration = 60 / tempo / 4 // Duration of each 16th note

      // Create simple drum sounds using Web Audio API directly
      const createKickSound = (context: OfflineAudioContext, startTime: number) => {
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(60, startTime)
        oscillator.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.5)

        gainNode.gain.setValueAtTime(0.3, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5)

        oscillator.connect(gainNode)
        gainNode.connect(context.destination)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.5)
      }

      const createSnareSound = (context: OfflineAudioContext, startTime: number) => {
        const bufferSize = context.sampleRate * 0.2
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
        const output = buffer.getChannelData(0)

        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1
        }

        const noise = context.createBufferSource()
        const filter = context.createBiquadFilter()
        const gainNode = context.createGain()

        noise.buffer = buffer
        filter.type = "bandpass"
        filter.frequency.value = 3000
        filter.Q.value = 1

        gainNode.gain.setValueAtTime(0.2, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2)

        noise.connect(filter)
        filter.connect(gainNode)
        gainNode.connect(context.destination)

        noise.start(startTime)
        noise.stop(startTime + 0.2)
      }

      const createHihatSound = (context: OfflineAudioContext, startTime: number) => {
        const bufferSize = context.sampleRate * 0.1
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
        const output = buffer.getChannelData(0)

        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1
        }

        const noise = context.createBufferSource()
        const filter = context.createBiquadFilter()
        const gainNode = context.createGain()

        noise.buffer = buffer
        filter.type = "highpass"
        filter.frequency.value = 8000

        gainNode.gain.setValueAtTime(0.1, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1)

        noise.connect(filter)
        filter.connect(gainNode)
        gainNode.connect(context.destination)

        noise.start(startTime)
        noise.stop(startTime + 0.1)
      }

      const createClapSound = (context: OfflineAudioContext, startTime: number) => {
        const bufferSize = context.sampleRate * 0.15
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
        const output = buffer.getChannelData(0)

        // Generate pink noise
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.5
        }

        const noise = context.createBufferSource()
        const filter = context.createBiquadFilter()
        const gainNode = context.createGain()

        noise.buffer = buffer
        filter.type = "highpass"
        filter.frequency.value = 2000

        gainNode.gain.setValueAtTime(0.15, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15)

        noise.connect(filter)
        filter.connect(gainNode)
        gainNode.connect(context.destination)

        noise.start(startTime)
        noise.stop(startTime + 0.15)
      }

      const createTomSound = (context: OfflineAudioContext, startTime: number) => {
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(200, startTime)
        oscillator.frequency.exponentialRampToValueAtTime(50, startTime + 0.3)

        gainNode.gain.setValueAtTime(0.2, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)

        oscillator.connect(gainNode)
        gainNode.connect(context.destination)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.3)
      }

      // Schedule all the sounds
      for (let step = 0; step < STEPS; step++) {
        const stepTime = step * stepDuration

        pattern.forEach((track, trackIndex) => {
          if (track[step]) {
            const soundName = SAMPLES[trackIndex].name.toLowerCase()

            switch (soundName) {
              case "kick":
                createKickSound(offlineContext, stepTime)
                break
              case "snare":
                createSnareSound(offlineContext, stepTime)
                break
              case "hi-hat":
                createHihatSound(offlineContext, stepTime)
                break
              case "clap":
                createClapSound(offlineContext, stepTime)
                break
              case "tom":
                createTomSound(offlineContext, stepTime)
                break
            }
          }
        })
      }

      // Render the audio
      const renderedBuffer = await offlineContext.startRendering()

      // Convert to WAV
      const wavBuffer = audioBufferToWav(renderedBuffer)
      const blob = new Blob([wavBuffer], { type: "audio/wav" })

      // Download the file
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "beat-pattern.wav"
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "WAV exported",
        description: "Your beat pattern has been exported as a WAV file.",
      })
    } catch (error) {
      console.error("Error exporting WAV:", error)
      toast({
        title: "Export error",
        description: "There was an error exporting the WAV file.",
        variant: "destructive",
      })
    }
  }

  // Export pattern as MIDI
  const exportMIDI = () => {
    try {
      // Simple MIDI file structure
      const ticksPerQuarter = 480
      const ticksPerStep = ticksPerQuarter / 4 // 16th notes

      // MIDI note mappings for drum sounds (General MIDI drum map)
      const drumNotes = {
        kick: 36, // Bass Drum 1
        snare: 38, // Acoustic Snare
        "hi-hat": 42, // Closed Hi Hat
        clap: 39, // Hand Clap
        tom: 45, // Low Tom
      }

      // Create MIDI events
      const events: number[] = []

      // Add tempo event (set tempo meta event)
      const microsecondsPerQuarter = Math.round(60000000 / tempo)
      events.push(
        0x00, // Delta time
        0xff,
        0x51,
        0x03, // Set tempo meta event
        (microsecondsPerQuarter >> 16) & 0xff,
        (microsecondsPerQuarter >> 8) & 0xff,
        microsecondsPerQuarter & 0xff,
      )

      // Add note events
      let currentTick = 0
      for (let step = 0; step < STEPS; step++) {
        const stepTick = step * ticksPerStep
        const deltaTime = stepTick - currentTick

        pattern.forEach((track, trackIndex) => {
          if (track[step]) {
            const soundName = SAMPLES[trackIndex].name.toLowerCase() as keyof typeof drumNotes
            const note = drumNotes[soundName]

            // Add note on event
            events.push(
              ...encodeVariableLength(deltaTime),
              0x99, // Note on, channel 10 (drums)
              note,
              100, // Velocity
            )

            // Add note off event after short duration
            events.push(
              ...encodeVariableLength(60), // Short duration
              0x89, // Note off, channel 10
              note,
              0, // Velocity
            )

            currentTick = stepTick + 60
          }
        })
      }

      // End of track
      events.push(0x00, 0xff, 0x2f, 0x00)

      // Create MIDI file
      const trackLength = events.length
      const midiFile = new Uint8Array(14 + 8 + trackLength)
      let offset = 0

      // MIDI header chunk
      midiFile.set([0x4d, 0x54, 0x68, 0x64], offset) // "MThd"
      offset += 4
      midiFile.set([0x00, 0x00, 0x00, 0x06], offset) // Header length
      offset += 4
      midiFile.set([0x00, 0x01], offset) // Format type 1
      offset += 2
      midiFile.set([0x00, 0x01], offset) // Number of tracks
      offset += 2
      midiFile.set([(ticksPerQuarter >> 8) & 0xff, ticksPerQuarter & 0xff], offset) // Ticks per quarter
      offset += 2

      // Track chunk
      midiFile.set([0x4d, 0x54, 0x72, 0x6b], offset) // "MTrk"
      offset += 4
      midiFile.set(
        [(trackLength >> 24) & 0xff, (trackLength >> 16) & 0xff, (trackLength >> 8) & 0xff, trackLength & 0xff],
        offset,
      ) // Track length
      offset += 4
      midiFile.set(events, offset) // Track data

      // Create blob and download
      const blob = new Blob([midiFile], { type: "audio/midi" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "beat-pattern.mid"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "MIDI exported",
        description: "Your beat pattern has been exported as a MIDI file.",
      })
    } catch (error) {
      console.error("Error exporting MIDI:", error)
      toast({
        title: "Export error",
        description: "There was an error exporting the MIDI file.",
        variant: "destructive",
      })
    }
  }

  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const bytesPerSample = 2
    const blockAlign = numberOfChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = length * blockAlign
    const bufferSize = 44 + dataSize

    const arrayBuffer = new ArrayBuffer(bufferSize)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, bufferSize - 8, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true) // PCM format
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true) // 16-bit
    writeString(36, "data")
    view.setUint32(40, dataSize, true)

    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }
    }

    return arrayBuffer
  }

  // Helper function to encode variable length quantity (fixed)
  const encodeVariableLength = (value: number): number[] => {
    if (value === 0) return [0]

    const bytes: number[] = []
    bytes.unshift(value & 0x7f)
    value >>= 7

    while (value > 0) {
      bytes.unshift((value & 0x7f) | 0x80)
      value >>= 7
    }

    return bytes
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
        setSelectedKit(data.selectedKit || "Default")
        setMetronome(data.metronome || false)
        setQuantize(data.quantize || true)
        setTrackSettings(data.trackSettings || INITIAL_TRACK_SETTINGS)

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

      if (trackIndex !== -1 && samplesLoaded) {
        // Play the sound
        const soundName = SAMPLES[trackIndex].name.toLowerCase()
        const synth = synthsRef.current[soundName]
        if (synth) {
          if (soundName === "kick") {
            synth.triggerAttackRelease("C1", "8n")
          } else if (soundName === "snare") {
            synth.triggerAttackRelease("8n")
          } else if (soundName === "hi-hat") {
            synth.triggerAttackRelease("32n")
          } else if (soundName === "clap") {
            synth.triggerAttackRelease("8n")
          } else if (soundName === "tom") {
            synth.triggerAttackRelease("G2", "8n")
          }
        }

        // If we're playing, add to the current step
        if (isPlaying && quantize) {
          toggleStep(trackIndex, currentStep)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlaying, currentStep, quantize, samplesLoaded])

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

  // Calculate position and toggle step
  const calculatePositionAndToggle = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Get the canvas bounds
    const rect = canvas.getBoundingClientRect()

    // Calculate the scaling factor between displayed size and canvas internal size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    // Get coordinates relative to canvas, scaled to internal dimensions
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    // Calculate center and radius using internal canvas dimensions
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
        return
      }
    }
  }

  // Handle mouse click
  const handleMouseClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMobile) return // Skip on mobile devices, we'll use touch events instead
    calculatePositionAndToggle(e.clientX, e.clientY)
  }

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent default touch behavior
    touchStartedRef.current = true

    if (e.touches.length === 0) return
    calculatePositionAndToggle(e.touches[0].clientX, e.touches[0].clientY)
  }

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent default touch behavior
    touchStartedRef.current = false
  }

  // Handle touch move (to prevent scrolling)
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent scrolling
  }

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
      <div className="relative mb-4">
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="w-full max-w-[600px] h-auto cursor-pointer touch-none"
          onClick={handleMouseClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        />
      </div>

      <div className="w-full max-w-[600px] grid gap-6">
        {/* Main controls */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={togglePlay} className="flex items-center gap-2" disabled={!samplesLoaded}>
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

          <Button onClick={exportWAV} variant="outline">
            <FileAudio className="h-4 w-4 mr-2" />
            Export WAV
          </Button>

          <Button onClick={exportMIDI} variant="outline">
            <Music className="h-4 w-4 mr-2" />
            Export MIDI
          </Button>

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

        {/* Kit selection */}
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Drum Kit</span>
          </div>
          <Select value={selectedKit} onValueChange={setSelectedKit}>
            <SelectTrigger>
              <SelectValue placeholder="Select a kit" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(KITS).map((kitName) => (
                <SelectItem key={kitName} value={kitName}>
                  {kitName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        <Mixer
          trackSettings={trackSettings}
          handleTrackSettingChange={handleTrackSettingChange}
          samples={SAMPLES}
          trackColors={TRACK_COLORS}
        />

        {/* Instructions */}
        <div className="text-sm text-muted-foreground mt-4">
          <p className="mb-2">
            <strong>Instructions:</strong> Click on the circles to add/remove beats. Press keyboard keys (A-E) to
            trigger sounds. All sounds are generated synthetically for reliability.
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
