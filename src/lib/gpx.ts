import type { Session } from './types'
import { MODES } from './types'

const ENT: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
}
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ENT[c])

/** GPX 1.1 with the Garmin TrackPointExtension, so Strava keeps the heart rate. */
export function toGPX(s: Session) {
  const label = MODES.find((m) => m.id === s.mode)?.label ?? 'Workout'
  const name = s.title || `${label} - ${new Date(s.startedAt).toLocaleString()}`
  const pts = s.samples
    .filter((p) => p.lat != null && p.lon != null)
    .map((p) => {
      const time = new Date(s.startedAt + p.t).toISOString()
      const ele = p.alt != null ? `<ele>${p.alt.toFixed(1)}</ele>` : ''
      const hr =
        p.hr != null
          ? `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${p.hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>`
          : ''
      return `<trkpt lat="${p.lat!.toFixed(6)}" lon="${p.lon!.toFixed(6)}">${ele}<time>${time}</time>${hr}</trkpt>`
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Kardio" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">',
    `<metadata><name>${esc(name)}</name><time>${new Date(s.startedAt).toISOString()}</time></metadata>`,
    `<trk><name>${esc(name)}</name><type>${s.mode}</type><trkseg>`,
    pts,
    '</trkseg></trk>',
    '</gpx>',
  ].join('\n')
}

export function download(filename: string, content: string, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
