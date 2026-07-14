import { useRef, useEffect, useState, useCallback } from 'react'

interface SignaturePadProps {
  onSignatureChange?: (dataUrl: string | null) => void
  width?: number
  height?: number
  className?: string
  label?: string
}

export function SignaturePad({
  onSignatureChange,
  width = 300,
  height = 150,
  className = '',
  label = 'Signature',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas for high-DPI displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Drawing style
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [width, height])

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()

      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0]
        if (!touch) return null
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      }

      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    []
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      const point = getCoordinates(e)
      if (!point) return

      setIsDrawing(true)
      lastPointRef.current = point

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      ctx.beginPath()
      ctx.moveTo(point.x, point.y)
    },
    [getCoordinates]
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      if (!isDrawing) return

      const point = getCoordinates(e)
      if (!point) return

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx || !lastPointRef.current) return

      ctx.beginPath()
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()

      lastPointRef.current = point
      setHasSignature(true)
    },
    [isDrawing, getCoordinates]
  )

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
      lastPointRef.current = null

      // Export signature as data URL
      const canvas = canvasRef.current
      if (canvas && hasSignature) {
        const dataUrl = canvas.toDataURL('image/png')
        onSignatureChange?.(dataUrl)
      }
    }
  }, [isDrawing, hasSignature, onSignatureChange])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasSignature(false)
    onSignatureChange?.(null)
  }, [onSignatureChange])

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
        {hasSignature && (
          <button
            type="button"
            onClick={clearSignature}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Clear
          </button>
        )}
      </div>
      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white relative">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none w-full"
          style={{ width, height }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-[var(--color-text-muted)]">Sign here</p>
          </div>
        )}
      </div>
    </div>
  )
}
