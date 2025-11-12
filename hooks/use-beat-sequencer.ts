"use client"

import type { ChangeEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import * as Tone from "tone"
import pako from "pako"

import { useToast } from "@/hooks/use-toast"
import { KITS } from "@/lib/kits"
import {
  INITIAL_PATTERN,
  INITIAL_TEMPO,
  INITIAL_TRACK_SETTINGS,
  SAMPLES,
  STEPS,
  type TrackSettings,
} from "@/components/beat-sequencer/constants"

interface UseBeatSequencerOptions {
  isMobile: boolean
}

export const clonePattern = (pattern: boolean[][]) => pattern.map((row) => [...row])

export const uint8ToBase64 = (bytes: Uint8Array) => {
  let binary = ""
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }

  return btoa(binary)
}

export const base64ToUint8 = (base64: string) => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

export const bytesToString = (bytes: Uint8Array) => {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes)
  }

  let result = ""

  bytes.forEach((byte) => {
    result += String.fromCharCode(byte)
  })

  return result
}

export function useBeatSequencer({ isMobile }: UseBeatSequencerOptions) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const lastStepRef = useRef(0)
  const [tempo, setTempo] = useState(INITIAL_TEMPO)
  const tempoRef = useRef(INITIAL_TEMPO)
  const [swing, setSwing] = useState(0)
  const swingRef = useRef(0)
  const [selectedKit, setSelectedKit] = useState("Default")
  const [metronome, setMetronome] = useState(false)
  const [quantize, setQuantize] = useState(true)
  const [pattern, setPattern] = useState<boolean[][]>(clonePattern(INITIAL_PATTERN))
  const [trackSettings, setTrackSettings] = useState<TrackSettings[]>(
    INITIAL_TRACK_SETTINGS.map((settings) => ({ ...settings })),
  )
  const [history, setHistory] = useState<boolean[][][]>([clonePattern(INITIAL_PATTERN)])
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyIndexRef = useRef(0)
  const historyRef = useRef<boolean[][][]>([clonePattern(INITIAL_PATTERN)])
  const { toast } = useToast()

  const synthsRef = useRef<Record<string, any>>({})
  const effectsRef = useRef<Record<string, any>>({})
  const sequencerRef = useRef<Tone.Sequence | null>(null)
  const [samplesLoaded, setSamplesLoaded] = useState(false)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  useEffect(() => {
    lastStepRef.current = currentStep
  }, [currentStep])

  useEffect(() => {
    historyIndexRef.current = historyIndex
  }, [historyIndex])

  useEffect(() => {
    historyRef.current = history
  }, [history])

  useEffect(() => {
    swingRef.current = swing
    Tone.Transport.swing = swing / 100
    Tone.Transport.swingSubdivision = "16n"
  }, [swing])

  useEffect(() => {
    tempoRef.current = tempo
    Tone.Transport.bpm.value = tempo
  }, [tempo])

  useEffect(() => {
    if (!samplesLoaded) return

    const kit = KITS[selectedKit as keyof typeof KITS]

    trackSettings.forEach((settings, trackIndex) => {
      const sampleInfo = SAMPLES[trackIndex]
      const soundName = sampleInfo.name.toLowerCase()
      const synth = synthsRef.current[soundName]

      if (synth) {
        synth.volume.value = settings.volume

        const pitchInCents = settings.pitch

        if (synth.detune) {
          synth.detune.value = pitchInCents
        } else if (synth instanceof Tone.NoiseSynth) {
          const sampleName = sampleInfo.name as keyof typeof kit
          const kitSound = kit[sampleName]
          // @ts-ignore - kit sound options are specific per instrument
          const initialPlaybackRate = kitSound?.options?.noise?.playbackRate || 1
          synth.noise.playbackRate = initialPlaybackRate * 2 ** (pitchInCents / 1200)
        }
      }
    })
  }, [trackSettings, samplesLoaded, selectedKit])

  useEffect(() => {
    if (!samplesLoaded) return

    trackSettings.forEach((settings, trackIndex) => {
      const soundName = SAMPLES[trackIndex].name.toLowerCase()
      const effects = effectsRef.current[soundName]
      if (effects) {
        effects.reverb.wet.value = settings.effectsOn ? settings.reverb : 0
        effects.delay.wet.value = settings.effectsOn ? settings.delay : 0
        effects.noise.gain.value = settings.effectsOn ? settings.noise : 0
      }
    })
  }, [trackSettings, samplesLoaded])

  useEffect(() => {
    const wasTransportRunning = Tone.Transport.state === "started"
    const previousPosition = Tone.Transport.position
    const wasSequenceStarted = sequencerRef.current?.state === "started"
    const resumeStepIndex = (lastStepRef.current + 1) % STEPS

    if (wasTransportRunning) {
      Tone.Transport.pause()
    }

    let mounted = true
    setSamplesLoaded(false)
    setLoadingError(null)

    const initializeAudio = async () => {
      try {
        if (typeof window === "undefined" || !mounted) return

        Tone.Transport.cancel()
        if (sequencerRef.current) {
          sequencerRef.current.dispose()
        }
        Object.values(synthsRef.current).forEach((s) => s.dispose())
        Object.values(effectsRef.current).forEach((effectGroup) => {
          Object.values(effectGroup).forEach((fx: any) => fx.dispose())
        })

        Tone.Transport.bpm.value = tempoRef.current
        Tone.Transport.swing = swingRef.current / 100

        const synths: Record<string, any> = {}
        const effects: Record<string, any> = {}
        const kit = KITS[selectedKit as keyof typeof KITS]

        SAMPLES.forEach((sample) => {
          const soundName = sample.name.toLowerCase()
          const kitSound = kit[sample.name as keyof typeof kit]
          if (kitSound) {
            const SynthClass = Tone[kitSound.type as keyof typeof Tone]
            if (typeof SynthClass === "function") {
              const synth = new (SynthClass as new (...args: any[]) => any)(kitSound.options)
              const reverb = new Tone.Reverb({ decay: 1.5, wet: 0 })
              const delay = new Tone.FeedbackDelay("8n", 0.25)
              delay.wet.value = 0

              const noise = new Tone.Noise("white").start()
              const noiseGain = new Tone.Gain(0)
              noise.connect(noiseGain)

              synth.chain(reverb, delay, Tone.Destination)
              noiseGain.toDestination()

              synths[soundName] = synth
              effects[soundName] = { reverb, delay, noise: noiseGain, noiseSource: noise }
            }
          }
        })

        synths.metronome = new Tone.Synth().toDestination()

        if (!mounted) return

        synthsRef.current = synths
        effectsRef.current = effects

        const sequence = new Tone.Sequence(
          (time, step) => {
            if (!mounted) return
            setCurrentStep(step)
            pattern.forEach((track, trackIndex) => {
              if (track[step]) {
                const soundName = SAMPLES[trackIndex].name.toLowerCase()
                const synth = synthsRef.current[soundName]
                if (synth) {
                  try {
                    if (soundName === "kick") synth.triggerAttackRelease("C1", "8n", time)
                    else if (soundName === "snare") synth.triggerAttackRelease("8n", time)
                    else if (soundName === "hi-hat") synth.triggerAttackRelease("32n", time)
                    else if (soundName === "clap") synth.triggerAttackRelease("8n", time)
                    else if (soundName === "tom") synth.triggerAttackRelease("G2", "8n", time)
                  } catch (e) {
                    // ignore playback errors
                  }
                }
              }
            })
            if (metronome && step % 4 === 0) {
              synthsRef.current["metronome"]?.triggerAttackRelease("C5", "32n", time)
            }
          },
          Array.from({ length: STEPS }, (_, i) => i),
          "16n",
        )
        sequencerRef.current = sequence

        if (mounted) {
          setSamplesLoaded(true)
          setLoadingError(null)
        }

        if (mounted && wasTransportRunning && wasSequenceStarted) {
          try {
            if (sequencerRef.current && sequencerRef.current.state !== "started") {
              sequencerRef.current.start(0, resumeStepIndex)
            }
            Tone.Transport.start("+0", previousPosition)
          } catch (resumeError) {
            console.error("Error resuming playback:", resumeError)
            setIsPlaying(false)
          }
        }
      } catch (error) {
        if (mounted) {
          setLoadingError(error instanceof Error ? error.message : "Failed to initialize audio")
          setSamplesLoaded(true)
        }
      }
    }

    initializeAudio()

    return () => {
      mounted = false
      if (sequencerRef.current) {
        sequencerRef.current.dispose()
      }
      Object.values(synthsRef.current).forEach((synth) => {
        if (synth && !synth.disposed) synth.dispose()
      })
      Object.values(effectsRef.current).forEach((effectGroup) => {
        Object.values(effectGroup).forEach((effect: any) => {
          if (effect && !effect.disposed) effect.dispose()
        })
      })
    }
  }, [selectedKit])

  useEffect(() => {
    if (sequencerRef.current && samplesLoaded) {
      try {
        sequencerRef.current.callback = (time, step) => {
          setCurrentStep(step)

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

          if (metronome && step % 4 === 0) {
            const metronomeSynth = synthsRef.current["metronome"]
            if (metronomeSynth) {
              try {
                metronomeSynth.triggerAttackRelease("C5", "32n", time)
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

  const addToHistory = useCallback((newPattern: boolean[][]) => {
    setHistory((prevHistory) => {
      const truncated = prevHistory.slice(0, historyIndexRef.current + 1)
      const updated = [...truncated, clonePattern(newPattern)]
      historyRef.current = updated
      historyIndexRef.current = updated.length - 1
      return updated
    })
    setHistoryIndex(historyIndexRef.current)
  }, [])

  const togglePlay = useCallback(async () => {
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
        if (Tone.Transport.state === "started") {
          Tone.Transport.pause()
        }
        setIsPlaying(false)
      } catch (error) {
        console.error("Error stopping playback:", error)
        setIsPlaying(false)
      }
    }
  }, [isPlaying, samplesLoaded, toast])

  const handleClear = useCallback(() => {
    const newPattern = clonePattern(INITIAL_PATTERN)
    setPattern(newPattern)
    addToHistory(newPattern)
  }, [addToHistory])

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      const newIndex = historyIndexRef.current - 1
      historyIndexRef.current = newIndex
      setHistoryIndex(newIndex)
      const previousPattern = historyRef.current[newIndex]
      if (previousPattern) {
        setPattern(clonePattern(previousPattern))
      }
    }
  }, [])

  const toggleStep = useCallback(
    (trackIndex: number, stepIndex: number) => {
      const newPattern = pattern.map((track, idx) =>
        idx === trackIndex
          ? track.map((value, innerIdx) => (innerIdx === stepIndex ? !value : value))
          : [...track],
      )

      setPattern(newPattern)
      addToHistory(newPattern)

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

      if (isMobile && "vibrate" in navigator) {
        try {
          navigator.vibrate(50)
        } catch (e) {
          // ignore vibration errors
        }
      }
    },
    [addToHistory, isMobile, isPlaying, pattern, samplesLoaded],
  )

  const savePattern = useCallback(() => {
    const data = {
      pattern,
      tempo,
      swing,
      selectedKit,
      metronome,
      quantize,
      trackSettings,
    }

    const jsonString = JSON.stringify(data)
    const dataUrl = `data:text/json;charset=utf-8,${encodeURIComponent(jsonString)}`

    const link = document.createElement("a")
    link.href = dataUrl
    link.download = "beat-pattern.json"
    link.click()

    toast({
      title: "Pattern saved",
      description: "Your beat pattern has been saved as a JSON file.",
    })
  }, [metronome, pattern, quantize, selectedKit, swing, tempo, toast, trackSettings])

  const processLoadedData = useCallback((data: any) => {
    if (!data || !data.pattern) return

    setPattern(clonePattern(data.pattern))
    setTempo(data.tempo ?? INITIAL_TEMPO)
    setSwing(data.swing ?? 0)
    setSelectedKit(data.selectedKit ?? "Default")
    setMetronome(data.metronome ?? false)
    setQuantize(data.quantize ?? true)

    const loadedTrackSettings = data.trackSettings
      ? data.trackSettings.map((loaded: Partial<TrackSettings>, i: number) => ({
          ...(INITIAL_TRACK_SETTINGS[i] || {}),
          ...loaded,
        }))
      : INITIAL_TRACK_SETTINGS.map((settings) => ({ ...settings }))
    setTrackSettings(loadedTrackSettings)

    const initialHistory = [clonePattern(data.pattern)]
    historyRef.current = initialHistory
    historyIndexRef.current = 0
    setHistory(initialHistory)
    setHistoryIndex(0)
  }, [])

  const loadPattern = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          processLoadedData(data)
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

      event.target.value = ""
    },
    [processLoadedData, toast],
  )

  const handleTrackSettingChange = useCallback(
    (trackIndex: number, setting: keyof TrackSettings, value: number | boolean) => {
      const newSettings = [...trackSettings]
      newSettings[trackIndex] = { ...newSettings[trackIndex], [setting]: value }
      setTrackSettings(newSettings)
    },
    [trackSettings],
  )

  const sharePattern = useCallback(() => {
    const data = {
      pattern,
      tempo,
      swing,
      selectedKit,
      metronome,
      quantize,
      trackSettings,
    }

    const jsonString = JSON.stringify(data)
    const compressed = pako.deflate(jsonString)
    const encoded = uint8ToBase64(compressed)
    const url = `${window.location.origin}${window.location.pathname}?pattern=${encodeURIComponent(encoded)}`

    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "URL copied to clipboard",
        description: "Share this URL to let others play your beat pattern.",
      })
    })
  }, [metronome, pattern, quantize, selectedKit, swing, tempo, toast, trackSettings])

  const audioBufferToWav = useCallback((buffer: AudioBuffer): ArrayBuffer => {
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

    const writeString = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, bufferSize - 8, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true)
    writeString(36, "data")
    view.setUint32(40, dataSize, true)

    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }
    }

    return arrayBuffer
  }, [])

  const exportWAV = useCallback(async () => {
    if (!samplesLoaded) {
      toast({
        title: "Audio not ready",
        description: "Please wait for audio to initialize before exporting.",
        variant: "destructive",
      })
      return
    }

    try {
      const stepDuration = 60 / tempo / 4
      const duration = stepDuration * STEPS
      const offlineDisposables: Array<{ dispose: () => void; disposed?: boolean }> = []

      const renderedBuffer = await Tone.Offline(() => {
        Tone.Transport.cancel()
        Tone.Transport.bpm.value = tempo
        Tone.Transport.swing = swing / 100
        Tone.Transport.swingSubdivision = "16n"
        Tone.Transport.position = 0

        const kit = KITS[selectedKit as keyof typeof KITS] ?? KITS.Default
        const offlineSynths: Record<string, any> = {}

        SAMPLES.forEach((sample, trackIndex) => {
          const soundName = sample.name.toLowerCase()
          const kitSound = kit[sample.name as keyof typeof kit] as
            | { type: string; options?: any }
            | undefined

          if (!kitSound) return

          const SynthClass = Tone[kitSound.type as keyof typeof Tone] as any
          if (typeof SynthClass !== "function") return

          const synth = new SynthClass(kitSound.options)
          const reverb = new Tone.Reverb({ decay: 1.5, wet: 0 })
          const delay = new Tone.FeedbackDelay("8n", 0.25)
          delay.wet.value = 0

          const noise = new Tone.Noise("white").start(0)
          const noiseGain = new Tone.Gain(0)
          noise.connect(noiseGain)
          noiseGain.toDestination()

          synth.chain(reverb, delay, Tone.Destination)

          offlineDisposables.push(synth, reverb, delay, noise, noiseGain)

          const settings = trackSettings[trackIndex]
          if (settings) {
            synth.volume.value = settings.volume

            const pitchInCents = settings.pitch
            if ("detune" in synth && synth.detune) {
              synth.detune.value = pitchInCents
            } else if (synth instanceof Tone.NoiseSynth) {
              const initialPlaybackRate =
                ((kitSound.options as any)?.noise?.playbackRate as number | undefined) ?? 1
              synth.noise.playbackRate = initialPlaybackRate * 2 ** (pitchInCents / 1200)
            }

            reverb.wet.value = settings.effectsOn ? settings.reverb : 0
            delay.wet.value = settings.effectsOn ? settings.delay : 0
            noiseGain.gain.value = settings.effectsOn ? settings.noise : 0
          }

          offlineSynths[soundName] = synth

          noise.stop(duration)
        })

        const sequence = new Tone.Sequence(
          (time, step) => {
            pattern.forEach((track, trackIndex) => {
              if (!track[step]) return

              const soundName = SAMPLES[trackIndex].name.toLowerCase()
              const synth = offlineSynths[soundName]
              if (!synth) return

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
                console.warn(`Error triggering ${soundName} during export:`, playError)
              }
            })
          },
          Array.from({ length: STEPS }, (_, i) => i),
          "16n",
        )

        offlineDisposables.push(sequence)

        sequence.start(0)
        Tone.Transport.start(0)
      }, duration)

      offlineDisposables.forEach((node) => {
        try {
          if (node && typeof node.dispose === "function" && !node.disposed) {
            node.dispose()
          }
        } catch (disposeError) {
          console.warn("Error disposing offline node:", disposeError)
        }
      })

      const wavBuffer = audioBufferToWav(renderedBuffer)
      const blob = new Blob([wavBuffer], { type: "audio/wav" })

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
  }, [
    audioBufferToWav,
    pattern,
    samplesLoaded,
    selectedKit,
    swing,
    tempo,
    toast,
    trackSettings,
  ])

  const encodeVariableLength = useCallback((value: number): number[] => {
    if (value === 0) return [0]

    const bytes: number[] = []
    bytes.unshift(value & 0x7f)
    value >>= 7

    while (value > 0) {
      bytes.unshift((value & 0x7f) | 0x80)
      value >>= 7
    }

    return bytes
  }, [])

  const exportMIDI = useCallback(() => {
    try {
      const ticksPerQuarter = 480
      const ticksPerStep = ticksPerQuarter / 4

      const drumNotes = {
        kick: 36,
        snare: 38,
        "hi-hat": 42,
        clap: 39,
        tom: 45,
      }

      const events: number[] = []

      const microsecondsPerQuarter = Math.round(60000000 / tempo)
      events.push(
        0x00,
        0xff,
        0x51,
        0x03,
        (microsecondsPerQuarter >> 16) & 0xff,
        (microsecondsPerQuarter >> 8) & 0xff,
        microsecondsPerQuarter & 0xff,
      )

      let currentTick = 0
      for (let step = 0; step < STEPS; step++) {
        const stepTick = step * ticksPerStep
        let stepHasNoteOn = false

        pattern.forEach((track, trackIndex) => {
          if (track[step]) {
            const soundName = SAMPLES[trackIndex].name.toLowerCase() as keyof typeof drumNotes
            const note = drumNotes[soundName]

            const noteOnDelta = stepHasNoteOn ? 0 : stepTick - currentTick

            events.push(
              ...encodeVariableLength(noteOnDelta),
              0x99,
              note,
              100,
            )

            stepHasNoteOn = true

            const noteDuration = 60

            events.push(
              ...encodeVariableLength(noteDuration),
              0x89,
              note,
              0,
            )

            currentTick = stepTick + noteDuration
          }
        })
      }

      events.push(0x00, 0xff, 0x2f, 0x00)

      const trackLength = events.length
      const midiFile = new Uint8Array(14 + 8 + trackLength)
      let offset = 0

      midiFile.set([0x4d, 0x54, 0x68, 0x64], offset)
      offset += 4
      midiFile.set([0x00, 0x00, 0x00, 0x06], offset)
      offset += 4
      midiFile.set([0x00, 0x01], offset)
      offset += 2
      midiFile.set([0x00, 0x01], offset)
      offset += 2
      midiFile.set([(ticksPerQuarter >> 8) & 0xff, ticksPerQuarter & 0xff], offset)
      offset += 2

      midiFile.set([0x4d, 0x54, 0x72, 0x6b], offset)
      offset += 4
      midiFile.set(
        [(trackLength >> 24) & 0xff, (trackLength >> 16) & 0xff, (trackLength >> 8) & 0xff, trackLength & 0xff],
        offset,
      )
      offset += 4
      midiFile.set(events, offset)

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
  }, [encodeVariableLength, pattern, tempo, toast])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const patternParam = params.get("pattern")

    if (patternParam) {
      try {
        const base64 = decodeURIComponent(patternParam)
        let jsonString: string

        try {
          const decodedBytes = base64ToUint8(base64)
          let bytes: Uint8Array

          try {
            bytes = pako.inflate(decodedBytes)
          } catch (error) {
            bytes = decodedBytes
          }

          jsonString = bytesToString(bytes)
        } catch (error) {
          jsonString = base64
        }

        const data = JSON.parse(jsonString)
        processLoadedData(data)
        toast({
          title: "Pattern loaded from URL",
          description: "A shared beat pattern has been loaded.",
        })
      } catch (error) {
        console.error("Error loading pattern from URL", error)
        toast({
          title: "Error loading pattern from URL",
          description: "The shared URL is invalid or corrupted.",
          variant: "destructive",
        })
      }
    }
  }, [processLoadedData, toast])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase()
      const trackIndex = SAMPLES.findIndex((sample) => sample.key === key)

      if (trackIndex !== -1 && samplesLoaded) {
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

        if (isPlaying && quantize) {
          toggleStep(trackIndex, currentStep)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentStep, isPlaying, quantize, samplesLoaded, toggleStep])

  return {
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
  }
}
