# Konva Rendering Patterns

Common patterns for rendering 2D games with react-konva.

## Stage Setup

```tsx
import { Stage, Layer, Rect, Text, Group, Image as KonvaImage } from 'react-konva'

import { useRef, useState, useEffect } from 'react'

interface StageDimensions {
  width: number
  height: number
}

export function useResponsiveStage(aspectRatio = number = 16/9): StageDimensions {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<StageDimensions>({ width: 960, height: 540 })

  useEffect(() => {
    if (!containerRef.current) return
    
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return { containerRef, dimensions }
}
```

## Sprite Sheet Rendering

```tsx
interface SpriteConfig {
  image: HTMLImageElement
  frameWidth: number
  frameHeight: number
  columns: number
  rows: number
}

export function Sprite({ 
  config, 
  column, 
  row, 
  x, 
  y, 
  scale = 1 
}: SpriteConfig & { x: number; y: number; scale?: number }) {
  const srcX = column * config.frameWidth
  const srcY = row * config.frameHeight
  
  return (
    <KonvaImage
      image={config.image}
      x={x}
      y={y}
      width={config.frameWidth}
      height={config.frameHeight}
      crop={{ x: srcX, y: srcY, width: config.frameWidth, height: config.frameHeight }}
      scaleX={scale}
    />
  )
}
```

## Animated Sprite (3x3 Sheet)
```tsx
import { useState, useEffect } from 'react'

export function useAnimatedSprite(
  config: SpriteConfig,
  column: number,
  row: number,
  animationSpeedMs: number = 150
) {
  const [frame, setFrame] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 3)
    }, animationSpeedMs)
    return () => clearInterval(interval)
  }, [animationSpeedMs])
  
  return { frame }
}

// Usage:
function Player({ x, y, direction, config }: Props) {
  const frame = useAnimatedSprite(config, 0, direction, 150)
  const row = 0 // Idle row
  
  return <Sprite config={config} column={frame} row={row} x={x} y={y} />
}
```

## Floating Text (Damage Numbers, Scores)
```tsx
interface FloatingTextProps {
  text: string
  x: number
  y: number
  color?: string
  duration?: number
}

export function FloatingText({ text, x, y, color = '#fff', duration = 1000 }: FloatingTextProps) {
  const [offset, setOffset] = useState({ y: 0, opacity: 1, scale: 1 })
  
  useEffect(() => {
    const start = performance.now()
    let frameId: number
    
    const animate = () => {
      const elapsed = performance.now() - start
      const progress = Math.min(1, elapsed / duration)
      
      setOffset({
        y: -100 * progress, // Float up
        opacity: 1 - progress,
        scale: 1 + progress * 0.5
      })
      
      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }
    
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [duration])
  
  return (
    <Text
      text={text}
      x={x}
      y={y + offset.y}
      fill={color}
      opacity={offset.opacity}
      fontSize={24}
      fontStyle='bold'
      scaleX={offset.scale}
      scaleY={offset.scale}
    />
  )
}
```

## Particle System
```tsx
interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export function useParticles(initialParticles: Particle[]) {
  const [particles, setParticles] = useState<Particle[]>(initialParticles)
  
  const updateParticles = (dt: number) => {
    setParticles(prev => 
      prev
        .map(p => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          life: p.life - dt,
        }))
        .filter(p => p.life > 0)
    )
  }
  
  const addParticle = (particle: Omit<Particle, 'id'>) => {
    setParticles(prev => [...prev, { ...particle, id: nanoid() }])
  }
  
  return { particles, updateParticles, addParticle }
}
```

## Background Layers (Parallax)
```tsx
interface ParallaxLayerProps {
  image: HTMLImageElement
  scrollSpeed: number
  offsetX: number
  canvasWidth: number
  canvasHeight: number
}

export function ParallaxLayer({ 
  image, 
  scrollSpeed, 
  offsetX, 
  canvasWidth, 
  canvasHeight 
}: ParallaxLayerProps) {
  const scaledWidth = image.width * 2
  
  return (
    <Group x={-offsetX * scrollSpeed}>
      <KonvaImage
        image={image}
        x={0}
        y={0}
        width={scaledWidth}
        height={canvasHeight}
      />
      <KonvaImage
        image={image}
        x={scaledWidth}
        y={0}
        width={scaledWidth}
        height={canvasHeight}
      />
    </Group>
  )
}
```

## Health Bar
```tsx
interface HealthBarProps {
  current: number
  max: number
  x: number
  y: number
  width: number
  height?: number
  color?: string
}

export function HealthBar({ current, max, x, y, width, height = 12, color = '#22c55e' }: HealthBarProps) {
  const percent = Math.max(0, Math.min(1, current / max))
  
  return (
    <Group x={x} y={y}>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill='#333'
        cornerRadius={4}
      />
      <Rect
        x={0}
        y={0}
        width={width * percent}
        height={height}
        fill={color}
        cornerRadius={4}
      />
      <Text
        x={width / 2}
        y={height / 2}
        text={`${current}/${max}`}
        fontSize={10}
        fill='#fff'
        align='center'
        verticalAlign='middle'
      />
    </Group>
  )
}
```

## Touch Input Overlay
```tsx
import { DPad } from '@/components/ui/DPad'
import { VirtualDPad } from '@/components/ui/VirtualDPad'

export function TouchControls({ 
  onInput, 
  type = 'dpad' 
}: { 
  onInput: (input: { dx: number; dy: number, cast?: boolean }) => void
  type?: 'dpad' | 'joystick'
}) {
  return (
    <div className='absolute bottom-8 left-8 z-10'>
      {type === 'dpad' ? (
        <DPad onInput={onInput} />
      ) : (
        <VirtualDPad onInput={onInput} />
      )}
    </div>
  )
}
```

## Common Layout Calculations

```tsx
// Grid cell sizing
export function calculateGridLayout(
  canvasWidth: number,
  canvasHeight: number,
  columns: number,
  rows: number,
  padding: number = 20
) {
  const availableWidth = canvasWidth - padding * 2
  const availableHeight = canvasHeight - padding * 2
  
  const cellSize = Math.min(
    availableWidth / columns,
    availableHeight / rows
  )
  
  const gridWidth = cellSize * columns
  const gridHeight = cellSize * rows
  const gridX = (canvasWidth - gridWidth) / 2
  const gridY = (canvasHeight - gridHeight) / 2
  
  return { cellSize, gridX, gridY, gridWidth, gridHeight }
}

// Safe zone for UI (Play.fun widget)
export const SAFE_ZONE = {
  TOP: 75, // pixels from top
  BOTTOM: 0,
  LEFT: 0,
  RIGHT: 1,
}
```
