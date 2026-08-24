// Generates all PWA icons at build time. No image deps — raw PNG encoder.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

/* ---------- minimal PNG encoder (RGBA, no interlace) ---------- */
const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
const crc32 = (buf) => {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------- drawing helpers ---------- */
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]

// distance from point to line segment
function distSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay
  const wx = px - ax, wy = py - ay
  const L = vx * vx + vy * vy
  const t = L === 0 ? 0 : clamp((wx * vx + wy * vy) / L)
  const dx = px - (ax + t * vx), dy = py - (ay + t * vy)
  return Math.hypot(dx, dy)
}

// Kardio heartbeat mark, normalized to a 0..1 box
const PATH = [
  [0.03, 0.50], [0.26, 0.50], [0.345, 0.285], [0.435, 0.735],
  [0.535, 0.14], [0.635, 0.63], [0.71, 0.50], [0.97, 0.50],
]

const BG_CORE = hex('#1A1F29')
const BG_EDGE = hex('#05060A')
// the five training zones, left to right — the mark IS the zone ramp
const RAMP = ['#3DD9EB', '#38E08A', '#F5D547', '#FF8A3D', '#FF4D6D'].map(hex)
function rampAt(t) {
  const x = clamp(t) * (RAMP.length - 1)
  const i = Math.min(Math.floor(x), RAMP.length - 2)
  return mix(RAMP[i], RAMP[i + 1], x - i)
}

function render(size, { scale = 0.78, bleed = false } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const S = size
  const half = S / 2
  // geometry of the mark
  const mw = S * scale
  const mx0 = (S - mw) / 2
  const my0 = (S - mw) / 2
  const pts = PATH.map(([x, y]) => [mx0 + x * mw, my0 + y * mw])
  const stroke = S * 0.052
  const hw = stroke / 2

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4
      // --- background: radial gradient + off-center bloom
      const dn = Math.hypot(x - half, y - half) / half
      let col = mix(BG_CORE, BG_EDGE, clamp(dn * 0.95))
      const bloom = Math.exp(-((Math.hypot(x - S * 0.62, y - S * 0.66) / (S * 0.5)) ** 2) * 2.2)
      col = mix(col, hex('#2A1430'), bloom * 0.55)
      const bloom2 = Math.exp(-((Math.hypot(x - S * 0.32, y - S * 0.3) / (S * 0.5)) ** 2) * 2.4)
      col = mix(col, hex('#082A33'), bloom2 * 0.6)

      // --- mark
      let d = Infinity
      for (let s = 0; s < pts.length - 1; s++) {
        d = Math.min(d, distSeg(x, y, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]))
      }
      const tx = clamp((x - mx0) / mw)
      const markCol = rampAt(tx)
      // glow
      const glow = Math.exp(-((d / (stroke * 1.9)) ** 2)) * 0.55
      col = mix(col, markCol, glow)
      // solid stroke, antialiased
      const a = smooth(hw + 0.9, hw - 0.9, d)
      col = mix(col, markCol, a)

      // --- rounded-square alpha (non-maskable icons only)
      let alpha = 255
      if (!bleed) {
        const r = S * 0.225
        const qx = Math.abs(x - half) - half + r
        const qy = Math.abs(y - half) - half + r
        const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
        alpha = Math.round(255 * smooth(0.8, -0.8, sd))
      }
      px[i] = Math.round(clamp(col[0], 0, 255))
      px[i + 1] = Math.round(clamp(col[1], 0, 255))
      px[i + 2] = Math.round(clamp(col[2], 0, 255))
      px[i + 3] = alpha
    }
  }
  return encodePNG(S, S, px)
}

const jobs = [
  ['icon-192.png', 192, { scale: 0.70 }],
  ['icon-512.png', 512, { scale: 0.70 }],
  ['icon-maskable-512.png', 512, { scale: 0.47, bleed: true }],
  ['apple-touch-icon.png', 180, { scale: 0.70, bleed: true }],
  ['favicon-64.png', 64, { scale: 0.84 }],
]
for (const [name, size, opts] of jobs) {
  writeFileSync(resolve(OUT, name), render(size, opts))
  console.log('icon:', name, size)
}
