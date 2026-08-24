type P = { size?: number; className?: string }

const S = (p: P) => ({
  width: p.size ?? 22,
  height: p.size ?? 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: p.className,
})

export const IRun = (p: P) => (
  <svg {...S(p)}>
    <circle cx="15.6" cy="4" r="2" />
    <path d="M11.4 21.6 13 15.9l-2.8-2.4c-.8-.7-1-1.9-.5-2.8l1.6-2.8c.5-.9 1.5-1.4 2.5-1.2l2 .4c.6.1 1.1.5 1.4 1l1 1.6c.4.6 1 1 1.8 1h1.4" />
    <path d="m13 15.9 3.5 2 1.4 3.7" />
    <path d="M10.1 8.7 6.6 10.1 5.2 13.6" />
    <path d="M2.4 17.6h4.3" />
  </svg>
)

export const IWalk = (p: P) => (
  <svg {...S(p)}>
    <circle cx="13.4" cy="4" r="2" />
    <path d="M11 21.8 12.6 15l-2.2-2.2c-.6-.6-.8-1.5-.5-2.3l1-2.6c.4-1 1.4-1.6 2.5-1.4l1.5.3c.8.2 1.4.7 1.7 1.4l.9 2c.3.7.9 1.2 1.7 1.3" />
    <path d="m12.6 15 3 2.1.8 4.7" />
    <path d="M9.9 9.3 7.8 11.8" />
  </svg>
)

export const IRide = (p: P) => (
  <svg {...S(p)}>
    <circle cx="5.2" cy="17.4" r="3.4" />
    <circle cx="18.8" cy="17.4" r="3.4" />
    <circle cx="15.4" cy="4.4" r="1.6" />
    <path d="m5.2 17.4 4.4-5.6 3.6 2.4 2-4.2" />
    <path d="M9.6 11.8h4.6l-1.4-3.4 3-1.6 2.3 2.4h2.1" />
  </svg>
)

export const IIndoor = (p: P) => (
  <svg {...S(p)}>
    <path d="M4 20V9.8a2 2 0 0 1 .9-1.7l6-4a2 2 0 0 1 2.2 0l6 4a2 2 0 0 1 .9 1.7V20" />
    <path d="M2.6 20.2h18.8" />
    <path d="M9.2 20v-4.6h5.6V20" />
  </svg>
)

export const IPulse = (p: P) => (
  <svg {...S(p)}>
    <path d="M2.6 12.2h4l2-5.4 3.4 10.6 2.4-6.6 1.6 3.4h5.4" />
  </svg>
)

export const IHome = (p: P) => (
  <svg {...S(p)}>
    <path d="M3.4 10.4 12 3.6l8.6 6.8" />
    <path d="M5.4 12v7.2a1.4 1.4 0 0 0 1.4 1.4h10.4a1.4 1.4 0 0 0 1.4-1.4V12" />
  </svg>
)

export const IHistory = (p: P) => (
  <svg {...S(p)}>
    <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1" />
    <path d="M3.2 4v4.2h4.2" />
    <path d="M12 7.6V12l3 1.9" />
  </svg>
)

export const ISliders = (p: P) => (
  <svg {...S(p)}>
    <path d="M3.4 7.2h11.2M18.8 7.2h1.8" />
    <path d="M3.4 16.8h4.2M11.8 16.8h8.8" />
    <circle cx="16.8" cy="7.2" r="2.2" />
    <circle cx="9.6" cy="16.8" r="2.2" />
  </svg>
)

export const IBluetooth = (p: P) => (
  <svg {...S(p)}>
    <path d="m7 7.4 10 9.2-5 4.4V2.9l5 4.5-10 9.2" />
  </svg>
)

export const IPlay = (p: P) => (
  <svg {...S(p)} fill="currentColor" stroke="none">
    <path d="M7.6 4.8a1 1 0 0 1 1.5-.9l10 7.2a1 1 0 0 1 0 1.7l-10 7.2a1 1 0 0 1-1.5-.9z" />
  </svg>
)

export const IPause = (p: P) => (
  <svg {...S(p)} fill="currentColor" stroke="none">
    <rect x="6.4" y="4.4" width="4" height="15.2" rx="1.4" />
    <rect x="13.6" y="4.4" width="4" height="15.2" rx="1.4" />
  </svg>
)

export const IStop = (p: P) => (
  <svg {...S(p)} fill="currentColor" stroke="none">
    <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="2.6" />
  </svg>
)

export const IFlag = (p: P) => (
  <svg {...S(p)}>
    <path d="M5.4 21V3.6" />
    <path d="M5.4 4.6h11.8l-2 3.6 2 3.6H5.4" />
  </svg>
)

export const IChevron = (p: P) => (
  <svg {...S(p)}>
    <path d="m9.4 5.6 6.4 6.4-6.4 6.4" />
  </svg>
)

export const IBack = (p: P) => (
  <svg {...S(p)}>
    <path d="M19.4 12H4.6" />
    <path d="m10.4 5.6-5.8 6.4 5.8 6.4" />
  </svg>
)

export const IClose = (p: P) => (
  <svg {...S(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const ICheck = (p: P) => (
  <svg {...S(p)}>
    <path d="m4.6 12.6 4.8 4.8L19.4 7.2" />
  </svg>
)

export const ITarget = (p: P) => (
  <svg {...S(p)}>
    <circle cx="12" cy="12" r="8.4" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="12" cy="12" r="0.9" fill="currentColor" />
  </svg>
)

export const IVibrate = (p: P) => (
  <svg {...S(p)}>
    <rect x="8.4" y="3.6" width="7.2" height="16.8" rx="2" />
    <path d="M4.6 9v6M2 10.6v2.8M19.4 9v6M22 10.6v2.8" />
  </svg>
)

export const ISpeaker = (p: P) => (
  <svg {...S(p)}>
    <path d="M4 9.4h3.2L12 5.2v13.6L7.2 14.6H4a1 1 0 0 1-1-1V10.4a1 1 0 0 1 1-1Z" />
    <path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.4 6.6a7.8 7.8 0 0 1 0 10.8" />
  </svg>
)

export const ITrash = (p: P) => (
  <svg {...S(p)}>
    <path d="M4.4 6.6h15.2" />
    <path d="M9 6.6V4.8a1.2 1.2 0 0 1 1.2-1.2h3.6A1.2 1.2 0 0 1 15 4.8v1.8" />
    <path d="M6.4 6.6 7.2 19a1.4 1.4 0 0 0 1.4 1.3h6.8A1.4 1.4 0 0 0 16.8 19l.8-12.4" />
  </svg>
)

export const IShare = (p: P) => (
  <svg {...S(p)}>
    <path d="M12 15.4V3.8" />
    <path d="m7.6 8.2 4.4-4.4 4.4 4.4" />
    <path d="M5 13.6v5.2a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6v-5.2" />
  </svg>
)

export const IEye = (p: P) => (
  <svg {...S(p)}>
    <path d="M2.4 12s3.8-6.4 9.6-6.4S21.6 12 21.6 12s-3.8 6.4-9.6 6.4S2.4 12 2.4 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
)

export const IMoon = (p: P) => (
  <svg {...S(p)}>
    <path d="M20 14.6A8.6 8.6 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.6Z" />
  </svg>
)

export const MODE_ICON = { run: IRun, walk: IWalk, ride: IRide, indoor: IIndoor, other: IPulse }
