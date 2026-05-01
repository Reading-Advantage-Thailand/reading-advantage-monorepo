'use client'

import React, { useRef, useState } from 'react'

interface VirtualDPadProps {
  onInput: (input: { dx: number; dy: number }) => void
}

export function VirtualDPad({ onInput }: VirtualDPadProps) {
  const [active, setActive] = useState(false)
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 })
  const centerRef = useRef<{ x: number; y: number } | null>(null)

  const startInput = (clientX: number, clientY: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect()
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
    setActive(true)
    updateInput(clientX, clientY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startInput(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget as HTMLElement)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    startInput(e.clientX, e.clientY, e.currentTarget as HTMLElement)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!active) return
    updateInput(e.touches[0].clientX, e.touches[0].clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!active) return
    updateInput(e.clientX, e.clientY)
  }

  const handleEnd = () => {
    setActive(false)
    centerRef.current = null
    setThumbPos({ x: 0, y: 0 })
    onInput({ dx: 0, dy: 0 })
  }

  const updateInput = (clientX: number, clientY: number) => {
    if (!centerRef.current) return
    const dxRaw = clientX - centerRef.current.x
    const dyRaw = clientY - centerRef.current.y
    
    const distance = Math.sqrt(dxRaw * dxRaw + dyRaw * dyRaw)
    const maxRadius = 40 // Constraint for thumb movement

    if (distance < 5) {
        setThumbPos({ x: 0, y: 0 })
        onInput({ dx: 0, dy: 0 })
        return
    }

    // Normalize for logic
    const angle = Math.atan2(dyRaw, dxRaw)
    
    // Position thumb (clamped to circle)
    const displayRadius = Math.min(distance, maxRadius)
    setThumbPos({
        x: Math.cos(angle) * displayRadius,
        y: Math.sin(angle) * displayRadius
    })

    // Logic input (snapped)
    let dx = Math.cos(angle)
    let dy = Math.sin(angle)
    
    if (Math.abs(dx) < 0.2) dx = 0
    if (Math.abs(dy) < 0.2) dy = 0
    if (dx > 0.8) dx = 1
    if (dx < -0.8) dx = -1
    if (dy > 0.8) dy = 1
    if (dy < -0.8) dy = -1

    onInput({ dx, dy })
  }

  return (
    <div 
        className="relative w-32 h-32 rounded-full bg-white/5 border-2 border-white/10 touch-none select-none shadow-inner"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onContextMenu={(e) => e.preventDefault()}
    >
        {/* Outer Ring Indicators */}
        <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
        
        {/* Thumb Stick */}
        <div 
            className={`absolute top-1/2 left-1/2 w-12 h-12 -mt-6 -ml-6 rounded-full bg-white/20 border-2 border-white/30 shadow-xl pointer-events-none transition-transform duration-75 ${active ? 'scale-110 opacity-100' : 'scale-100 opacity-50'}`}
            style={{ 
                transform: `translate(${thumbPos.x}px, ${thumbPos.y}px)` 
            }}
        >
            <div className="absolute inset-0 m-2 rounded-full bg-white/10" />
        </div>
        
        {/* Directional Marks */}
        <div className="absolute top-2 left-1/2 -ml-0.5 w-1 h-2 bg-white/20 rounded-full" />
        <div className="absolute bottom-2 left-1/2 -ml-0.5 w-1 h-2 bg-white/20 rounded-full" />
        <div className="absolute left-2 top-1/2 -mt-0.5 w-2 h-1 bg-white/20 rounded-full" />
        <div className="absolute right-2 top-1/2 -mt-0.5 w-2 h-1 bg-white/20 rounded-full" />
    </div>
  )
}
