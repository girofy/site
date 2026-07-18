/**
 * GIRO ENGINE — the film's protagonist.
 *
 * A procedural chrome turbine rendered on a single fixed canvas. It is the one
 * continuous object that carries the whole narrative:
 *
 *   hero   → heavy, slow spin, flinging particles outward (the leaking business)
 *   diag   → camera inside the mechanism; a scanner beam lights up red faults
 *   build  → light chapter; exploded parts assemble piece by piece
 *   cases  → quiet watermark spin (stage lights on the content)
 *   flow   → fast clean spin, particles converging inward (the fixed business)
 *   logo   → the segments morph into the Girofy G-arrow emblem
 *
 * Everything is procedural: no assets to load, one rAF, pooled particles.
 */

export type SceneName = 'hero' | 'diag' | 'build' | 'cases' | 'method' | 'flow' | 'founder' | 'logo'

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; size: number
  mode: 'leak' | 'converge'
}

interface FaultNode {
  a: number // angle on inner field
  r: number // radius factor
  label: number // beat index that owns it
  lit: number // 0..1 ignition
}

const SEGMENTS = 14
const TAU = Math.PI * 2

// Deterministic pseudo-random (stable between frames/reloads)
function prand(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export class GiroEngine {
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private particles: Particle[] = []
  private faults: FaultNode[] = []
  private rot = 0
  private rpm = 0.2
  private lastT = 0
  private morph = 0 // 0 ring → 1 logo

  scene: SceneName = 'hero'
  progress = 0
  reduced = false
  /** 0..1 — how hard the user is scrolling right now (Lenis velocity). The machine feels the hand. */
  boost = 0

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    this.ctx = ctx
    for (let i = 0; i < 12; i++) {
      this.faults.push({
        a: prand(i) * TAU,
        r: 0.25 + prand(i + 50) * 0.6,
        label: i % 4,
        lit: 0,
      })
    }
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w
    this.h = h
    this.dpr = Math.min(dpr, 2)
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  private get mobile() {
    return this.w < 768
  }

  private center(): [number, number, number] {
    const m = this.mobile
    const base = Math.min(this.w, this.h)
    switch (this.scene) {
      case 'hero':
        return m ? [this.w * 0.5, this.h * 0.70, base * 0.26] : [this.w * 0.70, this.h * 0.52, base * 0.32]
      case 'diag':
        // "inside the machine": ring larger than viewport
        return [this.w * 0.5, this.h * 0.5, Math.max(this.w, this.h) * 0.72]
      case 'build':
        return m ? [this.w * 0.5, this.h * 0.40, base * 0.26] : [this.w * 0.30, this.h * 0.5, base * 0.28]
      case 'cases':
      case 'method':
      case 'founder':
        return [this.w * 0.92, this.h * 0.12, base * 0.20]
      case 'flow':
        return [this.w * 0.5, this.h * 0.5, base * 0.26]
      case 'logo':
        return [this.w * 0.5, this.h * 0.19, Math.min(base * 0.15, 115)]
    }
  }

  /** Per-scene target spin speed (rad/s), plus the scroll-velocity boost */
  private targetRpm(): number {
    return this.baseRpm() + this.boost * 0.7 * (1 - this.morph)
  }

  private baseRpm(): number {
    switch (this.scene) {
      case 'hero': return 0.35
      case 'diag': return 0.10
      case 'build': return 0.15 + this.progress * 0.3
      case 'cases':
      case 'method':
      case 'founder': return 0.25
      case 'flow': return 1.6 + this.progress * 2.2
      case 'logo': return Math.max(0, 1.5 * (1 - this.progress * 1.6))
    }
  }

  /** Logo target pose for segment i: [x, y, angle] relative to center/R */
  private logoTarget(i: number, cx: number, cy: number, R: number): [number, number, number] {
    // 10 segments on the G arc (gap opens at -45° for the arrow)
    const gapCenter = -TAU / 8
    const gapHalf = 0.62
    if (i < 10) {
      const t = i / 9
      const a = gapCenter + gapHalf + t * (TAU - gapHalf * 2)
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R, a + TAU / 4]
    }
    if (i === 10) {
      // G crossbar reaching into the center
      return [cx + R * 0.35, cy + R * 0.06, 0]
    }
    const dir = gapCenter // up-right
    if (i === 11) {
      // arrow shaft crossing the gap outward
      return [cx + Math.cos(dir) * R * 1.02, cy + Math.sin(dir) * R * 1.02, dir]
    }
    // arrow head barbs
    const tipX = cx + Math.cos(dir) * R * 1.38
    const tipY = cy + Math.sin(dir) * R * 1.38
    const spread = i === 12 ? 2.5 : -2.5
    return [
      tipX + Math.cos(dir + spread) * R * 0.16,
      tipY + Math.sin(dir + spread) * R * 0.16,
      dir + spread,
    ]
  }

  private spawnParticle(cx: number, cy: number, R: number, mode: Particle['mode']) {
    if (this.particles.length > (this.mobile ? 90 : 220)) return
    if (mode === 'leak') {
      const a = prand(performance.now() % 10007) * TAU
      const speed = 40 + Math.random() * 90
      this.particles.push({
        x: cx + Math.cos(a) * R,
        y: cy + Math.sin(a) * R,
        vx: Math.cos(a + 0.9) * speed,
        vy: Math.sin(a + 0.9) * speed + 18,
        life: 0, maxLife: 2.2 + Math.random() * 1.6,
        size: 1 + Math.random() * 1.8,
        mode,
      })
    } else {
      const edge = Math.random()
      const x = edge < 0.5 ? (Math.random() < 0.5 ? -10 : this.w + 10) : Math.random() * this.w
      const y = edge < 0.5 ? Math.random() * this.h : (Math.random() < 0.5 ? -10 : this.h + 10)
      this.particles.push({
        x, y, vx: 0, vy: 0,
        life: 0, maxLife: 3.5,
        size: 1 + Math.random() * 1.6,
        mode,
      })
    }
  }

  render(now: number) {
    const dt = Math.min(0.05, (now - this.lastT) / 1000 || 0.016)
    this.lastT = now
    const { ctx } = this
    ctx.clearRect(0, 0, this.w, this.h)

    const dark = this.scene !== 'build' && this.scene !== 'cases'
    const [cx, cy, R] = this.center()

    // Spin
    this.rpm += (this.targetRpm() - this.rpm) * Math.min(1, dt * 2.2)
    this.rot += this.rpm * dt * (this.reduced ? 0 : 1)

    // Morph to logo
    const morphTarget = this.scene === 'logo' ? Math.min(1, this.progress * 1.35) : 0
    this.morph += (morphTarget - this.morph) * Math.min(1, dt * 3)

    // Explosion factor (build scene: parts fly apart then assemble)
    let explode = 0
    if (this.scene === 'build') explode = Math.max(0, 1 - this.progress * 1.25)

    // ---- Particles ----
    if (!this.reduced) {
      if (this.scene === 'hero' && Math.random() < 0.5) this.spawnParticle(cx, cy, R, 'leak')
      if (this.scene === 'flow' && Math.random() < 0.8) this.spawnParticle(cx, cy, R, 'converge')
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += dt
      if (p.mode === 'leak') {
        p.vy += 26 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      } else {
        // spiral toward the hub
        const dx = cx - p.x
        const dy = cy - p.y
        const d = Math.hypot(dx, dy) || 1
        const pull = 190 * dt
        p.vx += (dx / d) * pull - (dy / d) * pull * 0.6
        p.vy += (dy / d) * pull + (dx / d) * pull * 0.6
        p.vx *= 0.985
        p.vy *= 0.985
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (d < R * 0.55) p.life = p.maxLife // absorbed
      }
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1)
        continue
      }
      const fade = 1 - p.life / p.maxLife
      ctx.globalAlpha = (p.mode === 'leak' ? 0.5 : 0.7) * fade
      ctx.fillStyle = dark ? '#e8eaee' : '#3a3d42'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // ---- Diagnostic scene: scanner beam + fault nodes ----
    if (this.scene === 'diag') {
      const beamX = this.w * (this.progress * 1.15 - 0.05)
      const grad = ctx.createLinearGradient(beamX - 70, 0, beamX + 70, 0)
      grad.addColorStop(0, 'rgba(240,243,247,0)')
      grad.addColorStop(0.5, 'rgba(240,243,247,0.10)')
      grad.addColorStop(1, 'rgba(240,243,247,0)')
      ctx.fillStyle = grad
      ctx.fillRect(beamX - 70, 0, 140, this.h)
      ctx.fillStyle = 'rgba(240,243,247,0.35)'
      ctx.fillRect(beamX, 0, 1, this.h)

      for (const f of this.faults) {
        const fx = cx + Math.cos(f.a) * R * f.r * 0.5
        const fy = cy + Math.sin(f.a) * R * f.r * 0.5
        const target = beamX > fx ? 1 : 0
        f.lit += (target - f.lit) * Math.min(1, dt * 4)
        if (f.lit > 0.01) {
          const pulse = 0.75 + Math.sin(now / 300 + f.a * 7) * 0.25
          ctx.globalAlpha = f.lit * pulse
          ctx.fillStyle = '#ff3b30'
          ctx.beginPath()
          ctx.arc(fx, fy, 2.6, 0, TAU)
          ctx.fill()
          ctx.globalAlpha = f.lit * 0.14 * pulse
          ctx.beginPath()
          ctx.arc(fx, fy, 13, 0, TAU)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    }

    // ---- The turbine segments ----
    const segLen = Math.max(R * 0.42, 26)
    const segW = Math.max(R * 0.085, 5)
    for (let i = 0; i < SEGMENTS; i++) {
      const baseA = (i / SEGMENTS) * TAU + this.rot
      const ringR = R * (1 + explode * (0.5 + prand(i + 20) * 1.3))
      const rx = cx + Math.cos(baseA) * ringR
      const ry = cy + Math.sin(baseA) * ringR
      const rAngle = baseA + TAU / 4

      let x = rx, y = ry, ang = rAngle
      if (this.morph > 0.001) {
        const [tx, ty, ta] = this.logoTarget(i, cx, cy, R)
        const e = this.morph * this.morph * (3 - 2 * this.morph) // smoothstep
        x = rx + (tx - rx) * e
        y = ry + (ty - ry) * e
        // shortest-arc angle interpolation
        let da = ((ta - rAngle + Math.PI) % TAU + TAU) % TAU - Math.PI
        ang = rAngle + da * e
      }

      // arrowhead barbs shrink as they morph into place
      const len = i >= 12 ? segLen * (1 - 0.45 * this.morph) : segLen
      const cosA = Math.cos(ang), sinA = Math.sin(ang)
      const hx = cosA * len * 0.5, hy = sinA * len * 0.5

      // brushed-metal gradient along the segment
      const g = ctx.createLinearGradient(x - hx, y - hy, x + hx, y + hy)
      if (dark) {
        g.addColorStop(0, 'rgba(238,240,242,0.95)')
        g.addColorStop(0.5, 'rgba(160,165,173,0.9)')
        g.addColorStop(1, 'rgba(224,227,231,0.95)')
      } else {
        g.addColorStop(0, 'rgba(42,45,50,0.92)')
        g.addColorStop(0.5, 'rgba(96,101,110,0.88)')
        g.addColorStop(1, 'rgba(52,55,61,0.92)')
      }
      ctx.strokeStyle = g
      ctx.lineWidth = segW
      ctx.lineCap = 'round'

      // motion trail
      if (!this.reduced && this.rpm > 0.5 && this.morph < 0.5) {
        const trail = Math.min(0.35, (this.rpm - 0.5) * 0.2)
        ctx.globalAlpha = trail
        const ta2 = ang - this.rpm * 0.05
        ctx.beginPath()
        ctx.moveTo(x - Math.cos(ta2) * segLen * 0.5, y - Math.sin(ta2) * segLen * 0.5)
        ctx.lineTo(x + Math.cos(ta2) * segLen * 0.5, y + Math.sin(ta2) * segLen * 0.5)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.beginPath()
      ctx.moveTo(x - hx, y - hy)
      ctx.lineTo(x + hx, y + hy)
      ctx.stroke()
    }

    // Hub
    if (this.morph < 0.6 && this.scene !== 'diag') {
      ctx.globalAlpha = 0.9 * (1 - this.morph)
      ctx.fillStyle = dark ? '#f2f3f5' : '#2a2d32'
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(2.5, R * 0.03), 0, TAU)
      ctx.fill()
      ctx.globalAlpha = 0.25 * (1 - this.morph)
      ctx.strokeStyle = dark ? '#f2f3f5' : '#2a2d32'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.62, 0, TAU)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Flow scene: glow at the core (the engine "alive")
    if (this.scene === 'flow' && !this.reduced) {
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.7)
      const a = 0.10 + Math.min(0.10, this.rpm * 0.02)
      glow.addColorStop(0, `rgba(255,255,255,${a})`)
      glow.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.7, 0, TAU)
      ctx.fill()
    }
  }
}
