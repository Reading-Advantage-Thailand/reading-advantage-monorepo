'use client'

import React, { useState } from 'react'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

interface DPadProps {
  onInput: (input: { dx: number, dy: number, cast?: boolean }) => void
}

export function DPad({ onInput }: DPadProps) {
  const [direction, setDirection] = useState({ dx: 0, dy: 0 })

  const handleStart = (dx: number, dy: number) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault() 
    const newDir = { dx, dy }
    setDirection(newDir)
    onInput(newDir)
  }

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setDirection({ dx: 0, dy: 0 })
    onInput({ dx: 0, dy: 0 })
  }

  const handleDrop = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    onInput({ ...direction, cast: true })
    setTimeout(() => onInput({ ...direction, cast: false }), 100)
  }

  // Button styles
  const btnClass = "w-11 h-11 bg-slate-800/80 border-2 border-slate-600 rounded-full flex items-center justify-center active:bg-blue-600 active:border-blue-400 touch-none select-none transition-colors"

  return (
    <div 
      className="grid grid-cols-3 gap-1 p-2 bg-slate-900/50 rounded-full backdrop-blur-sm"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Row */}
      <div />
      <button 
        className={btnClass}
        onTouchStart={handleStart(0, -1)}
        onMouseDown={handleStart(0, -1)}
        onTouchEnd={handleEnd}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        <ArrowUp className="w-5 h-5 text-white" />
      </button>
      <div />

      {/* Middle Row */}
      <button 
        className={btnClass}
        onTouchStart={handleStart(-1, 0)}
        onMouseDown={handleStart(-1, 0)}
        onTouchEnd={handleEnd}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
      
      {/* Center / Drop Button */}
      <button 
        className={`${btnClass} bg-red-900/80 border-red-700 active:bg-red-600`}
        onTouchStart={handleDrop}
        onMouseDown={handleDrop}
      >
        <span className="text-[10px] font-bold text-white">DROP</span>
      </button>

      <button 
        className={btnClass}
        onTouchStart={handleStart(1, 0)}
        onMouseDown={handleStart(1, 0)}
        onTouchEnd={handleEnd}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        <ArrowRight className="w-5 h-5 text-white" />
      </button>

      {/* Bottom Row */}
      <div />
      <button 
        className={btnClass}
        onTouchStart={handleStart(0, 1)}
        onMouseDown={handleStart(0, 1)}
        onTouchEnd={handleEnd}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        <ArrowDown className="w-5 h-5 text-white" />
      </button>
      <div />
    </div>
  )
}
