/**
 * HelixDisplay — volumetric 3D helix temporal playback surface.
 *
 * Renders 365 days × 24 hours = 8 760 points as a pseudo-3D cylinder helix.
 * - Horizontal axis: Day of year (past → future)
 * - Angular position: Time of day (00:00 at bottom of each ring, 12:00 at top)
 * - Color scale: deep teal (−3σ) → forest green (0) → gold (+3σ)
 * - Depth-sorted rendering: front rings brighter and larger
 *
 * Data is deterministic and generated from a physics-informed seasonal +
 * daily profile — no Math.random(), reproducible across renders.
 */

import { useEffect, useRef, useMemo } from 'react'

const N_DAYS     = 365
const H_PER_DAY  = 24
const SIGMA_MAX  = 3.0

// ── Deterministic data generation ──────────────────────────────────────────
function generateHelixData(): Float32Array {
  const data = new Float32Array(N_DAYS * H_PER_DAY)
  for (let d = 0; d < N_DAYS; d++) {
    // Seasonal factor: peaks at summer solstice (~day 172)
    const season = 0.45 + 0.55 * Math.sin(2 * Math.PI * d / 365 - Math.PI / 2)
    for (let h = 0; h < H_PER_DAY; h++) {
      // Solar-like daily profile (peak at noon)
      const solar    = Math.sin(Math.PI * h / H_PER_DAY) * 2.2
      const harmonic = 0.3 * Math.sin(4 * Math.PI * h / H_PER_DAY + 0.4)
      // Deterministic LCG noise
      const idx   = d * H_PER_DAY + h
      const noise = Math.sin(idx * 127.1 + d * 311.7) * 0.45
      const dev   = season * (solar + harmonic) + noise - 0.35
      data[idx]   = Math.max(-SIGMA_MAX, Math.min(SIGMA_MAX, dev))
    }
  }
  return data
}

// ── Color mapping: teal → green → gold ─────────────────────────────────────
function devColor(dev: number, alpha: number): string {
  const t = (dev + SIGMA_MAX) / (2 * SIGMA_MAX) // 0 … 1
  let r: number, g: number, b: number
  if (t < 0.5) {
    const u = t * 2                          // 0 → 1
    r = Math.round(14  + u * (22  - 14 ))   // #0e7490 → #16a34a
    g = Math.round(116 + u * (163 - 116))
    b = Math.round(144 + u * (74  - 144))
  } else {
    const u = (t - 0.5) * 2                 // 0 → 1
    r = Math.round(22  + u * (251 - 22 ))   // #16a34a → #fbbf24
    g = Math.round(163 + u * (191 - 163))
    b = Math.round(74  + u * (36  - 74 ))
  }
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`
}

// ── Canvas render ───────────────────────────────────────────────────────────
interface Pt { sx: number; sy: number; depth: number; dev: number }

function renderHelix(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: Float32Array,
) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#050c05'
  ctx.fillRect(0, 0, w, h)

  const mL = 50, mR = 20, mT = 20, mB = 44
  const plotW = w - mL - mR
  const plotH = h - mT - mB

  // Helix axis: bottom-left → top-right
  const x0 = mL + plotW * 0.04
  const y0 = mT + plotH * 0.88
  const x1 = mL + plotW * 0.96
  const y1 = mT + plotH * 0.12

  const dDX = x1 - x0
  const dDY = y1 - y0
  const diagLen = Math.hypot(dDX, dDY)
  const dX = dDX / diagLen   // normalised diagonal direction
  const dY = dDY / diagLen

  // Perpendicular to axis (in screen plane — this gives the ring height)
  const pX = -dY
  const pY =  dX

  const R   = plotH * 0.21   // ring radius (perpendicular to axis)
  const rD  = R * 0.26       // depth compression factor (foreshortening)

  // Generate all 8 760 points
  const pts: Pt[] = new Array(N_DAYS * H_PER_DAY)
  let i = 0
  for (let day = 0; day < N_DAYS; day++) {
    const t  = day / (N_DAYS - 1)
    const ax = x0 + t * dDX
    const ay = y0 + t * dDY
    for (let hi = 0; hi < H_PER_DAY; hi++) {
      // theta=0 → midnight at bottom of ring; theta=π → noon at top
      const theta = 2 * Math.PI * hi / H_PER_DAY
      const cosT  = Math.cos(theta)
      const sinT  = Math.sin(theta)
      pts[i++] = {
        sx:    ax + R * cosT * pX + rD * sinT * dX,
        sy:    ay + R * cosT * pY + rD * sinT * dY,
        depth: sinT,
        dev:   data[day * H_PER_DAY + hi],
      }
    }
  }

  // Depth sort: back-to-front (painter's algorithm)
  pts.sort((a, b) => a.depth - b.depth)

  // Draw
  for (const pt of pts) {
    const front = (pt.depth + 1) * 0.5     // 0…1
    const alpha = 0.18 + 0.82 * front
    const size  = 0.7  + 1.4  * front
    ctx.fillStyle = devColor(pt.dev, alpha)
    ctx.beginPath()
    ctx.arc(pt.sx, pt.sy, size, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── Time-of-day labels (left axis, at day 0) ──────────────────────────────
  ctx.globalAlpha = 0.7
  ctx.fillStyle   = '#7ab87a'
  ctx.font        = '9px monospace'
  ctx.textAlign   = 'right'
  const t0  = 0 / (N_DAYS - 1)
  const ax0 = x0 + t0 * dDX
  const ay0 = y0 + t0 * dDY
  const timeLabels = [
    { h: 0,  label: '00:00' },
    { h: 6,  label: '06:00' },
    { h: 12, label: '12:00' },
    { h: 18, label: '18:00' },
  ]
  for (const tl of timeLabels) {
    const theta = 2 * Math.PI * tl.h / H_PER_DAY
    const ly    = ay0 + R * Math.cos(theta) * pY + rD * Math.sin(theta) * dY
    ctx.fillText(tl.label, ax0 - 5, ly + 3)
  }

  // ── Day axis labels (bottom) ──────────────────────────────────────────────
  ctx.textAlign = 'center'
  const dayLabels = [
    { d: 0,   label: 'Jan' },
    { d: 90,  label: 'Apr' },
    { d: 180, label: 'Jul' },
    { d: 274, label: 'Oct' },
    { d: 364, label: 'Dec' },
  ]
  for (const dl of dayLabels) {
    const t   = dl.d / (N_DAYS - 1)
    const lx  = x0 + t * dDX
    const ly  = y0 + t * dDY + R * pY + rD * dY + 14
    ctx.fillText(dl.label, lx, ly)
  }

  // ── Σ color scale legend ──────────────────────────────────────────────────
  const legW  = plotW * 0.45
  const legX  = mL + (plotW - legW) / 2
  const legY  = h - mB + 10
  const legH  = 7
  const grad  = ctx.createLinearGradient(legX, 0, legX + legW, 0)
  grad.addColorStop(0,   '#0e7490')
  grad.addColorStop(0.5, '#16a34a')
  grad.addColorStop(1,   '#fbbf24')
  ctx.globalAlpha = 0.85
  ctx.fillStyle   = grad
  ctx.fillRect(legX, legY, legW, legH)

  ctx.fillStyle = '#7ab87a'
  ctx.font      = '8px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('−3σ', legX,              legY + legH + 11)
  ctx.fillText('  0', legX + legW / 2,   legY + legH + 11)
  ctx.fillText('+3σ', legX + legW,        legY + legH + 11)

  ctx.globalAlpha = 1
}

// ── Component ───────────────────────────────────────────────────────────────
export default function HelixDisplay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const data      = useMemo(() => generateHelixData(), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    renderHelix(ctx, canvas.width, canvas.height, data)
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={380}
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 6 }}
      aria-label="Temporal Playback — Signature Helix"
    />
  )
}
