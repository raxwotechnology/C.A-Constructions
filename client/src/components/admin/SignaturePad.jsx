import { useRef, useEffect, useCallback } from 'react'
import { mediaUrl } from '../../lib/media'

export default function SignaturePad({ label, value, onChange, disabled }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)

  const syncFromValue = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    if (value) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
      }
      img.src = mediaUrl(value)
    }
  }, [value])

  useEffect(() => {
    syncFromValue()
  }, [syncFromValue])

  const pos = (e) => {
    const canvas = canvasRef.current
    const r = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: ((clientX - r.left) / r.width) * canvas.width,
      y: ((clientY - r.top) / r.height) * canvas.height,
    }
  }

  const start = (e) => {
    if (disabled) return
    e.preventDefault()
    drawing.current = true
    last.current = pos(e)
  }

  const draw = (e) => {
    if (!drawing.current || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const p = pos(e)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }

  const end = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    drawing.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-600">{label}</label>
        {!disabled && (
          <button type="button" onClick={clear} className="text-xs text-slate-400 hover:text-red-600">
            Clear
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={440}
        height={120}
        className={`w-full max-w-full rounded-lg border border-slate-200 bg-white touch-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-crosshair'}`}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={end}
      />
    </div>
  )
}
