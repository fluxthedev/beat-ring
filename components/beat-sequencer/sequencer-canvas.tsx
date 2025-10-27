"use client"

import { useEffect, useRef } from "react"
import type React from "react"

import { SAMPLES, STEPS, TRACK_COLORS } from "@/components/beat-sequencer/constants"

interface SequencerCanvasProps {
  pattern: boolean[][]
  currentStep: number
  isPlaying: boolean
  theme: string | undefined
  isMobile: boolean
  onToggleStep: (trackIndex: number, stepIndex: number) => void
}

export function SequencerCanvas({
  pattern,
  currentStep,
  isPlaying,
  theme,
  isMobile,
  onToggleStep,
}: SequencerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const touchStartedRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    const radius = Math.min(centerX, centerY) * 0.8

    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = theme === "dark" ? "#1a1a1a" : "#f5f5f5"
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = theme === "dark" ? "#333" : "#ddd"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    for (let i = 0; i < STEPS; i++) {
      const angle = (i / STEPS) * Math.PI * 2 - Math.PI / 2
      ctx.strokeStyle = i % 4 === 0 ? (theme === "dark" ? "#666" : "#999") : theme === "dark" ? "#333" : "#ddd"
      ctx.lineWidth = i % 4 === 0 ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
      ctx.stroke()

      ctx.fillStyle = theme === "dark" ? "#999" : "#666"
      ctx.font = "16px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      const textRadius = radius * 1.08
      ctx.fillText((i + 1).toString(), centerX + Math.cos(angle) * textRadius, centerY + Math.sin(angle) * textRadius)
    }

    for (let trackIndex = 0; trackIndex < SAMPLES.length; trackIndex++) {
      const trackRadius = radius * (0.9 - trackIndex * 0.15)

      ctx.strokeStyle = theme === "dark" ? "#444" : "#ccc"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(centerX, centerY, trackRadius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = TRACK_COLORS[trackIndex]
      ctx.font = "18px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(`${SAMPLES[trackIndex].name} (${SAMPLES[trackIndex].key})`, centerX, centerY - trackRadius)

      for (let stepIndex = 0; stepIndex < STEPS; stepIndex++) {
        const angle = (stepIndex / STEPS) * Math.PI * 2 - Math.PI / 2
        const x = centerX + Math.cos(angle) * trackRadius
        const y = centerY + Math.sin(angle) * trackRadius

        if (pattern[trackIndex][stepIndex]) {
          ctx.fillStyle = TRACK_COLORS[trackIndex]
          ctx.beginPath()
          ctx.arc(x, y, 14, 0, Math.PI * 2)
          ctx.fill()

          if (isPlaying && stepIndex === currentStep) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
            ctx.beginPath()
            ctx.arc(x, y, 18, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          ctx.fillStyle = theme === "dark" ? "#333" : "#ddd"
          ctx.beginPath()
          ctx.arc(x, y, 12, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = TRACK_COLORS[trackIndex]
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(x, y, 12, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    if (isPlaying) {
      const angle = (currentStep / STEPS) * Math.PI * 2 - Math.PI / 2

      ctx.strokeStyle = theme === "dark" ? "#fff" : "#000"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
      ctx.stroke()

      ctx.fillStyle = theme === "dark" ? "#fff" : "#000"
      ctx.beginPath()
      ctx.arc(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [currentStep, isPlaying, pattern, theme])

  const calculatePositionAndToggle = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const maxRadius = Math.min(centerX, centerY) * 0.8

    const dx = x - centerX
    const dy = y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    let angle = Math.atan2(dy, dx) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2

    const normalizedAngle = angle / (Math.PI * 2)
    const stepIndex = Math.round(normalizedAngle * STEPS) % STEPS

    for (let trackIndex = 0; trackIndex < SAMPLES.length; trackIndex++) {
      const trackRadius = maxRadius * (0.9 - trackIndex * 0.15)
      const touchRadius = isMobile ? 30 : 20
      const radiusMin = trackRadius - touchRadius
      const radiusMax = trackRadius + touchRadius

      if (distance >= radiusMin && distance <= radiusMax) {
        onToggleStep(trackIndex, stepIndex)
        return
      }
    }
  }

  const handleMouseClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMobile) return
    calculatePositionAndToggle(event.clientX, event.clientY)
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    touchStartedRef.current = true

    if (event.touches.length === 0) return
    const touch = event.touches[0]
    calculatePositionAndToggle(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    touchStartedRef.current = false
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartedRef.current) return
    event.preventDefault()
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={800}
      className="w-full max-w-[800px] h-auto cursor-pointer touch-none"
      onClick={handleMouseClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    />
  )
}
