# Kardio

Eyes-free heart-rate zone training. Pick a zone, put the phone in your pocket, and let the
buzzes and the voice hold you there. Nothing is uploaded anywhere — every session lives in
your phone's own storage.

Installable web app (PWA). Built for Chrome on Android, where Web Bluetooth and the
Vibration API both work.

---

## What it does

**The two things it exists for**

1. **Reads your WHOOP over Bluetooth.** WHOOP 4.0 / 5.0 / MG can broadcast heart rate on the
   standard BLE Heart Rate Profile. Kardio speaks that profile, so it pairs like any other
   strap — no WHOOP account, no API key, no cloud round trip. Polar, Garmin, Wahoo TICKR and
   every other standard strap work identically.

2. **Tells you your zone without you looking.** Set a target zone. When you drift out, you get
   a distinct vibration, a tone that cuts through your music, and a short spoken line. Stay in
   the zone and it stays silent.

**The rest of it**

- Run / Walk / Ride with GPS distance, live pace, average pace, auto-pause and auto-laps
- Indoor / Cardio modes that record heart rate only
- Live dial that draws your five zones to scale, so a glance is enough
- Eyes-free view: black screen, huge number, a glow that pulses at your actual heart rate
- Session history, splits, time-in-zone, heart-rate graph, route trace
- GPX export with heart rate embedded (imports into Strava, TrainingPeaks, anything)
- Full JSON backup of every session
- Works offline once installed

## The cue language

You learn it in one run and then never look at the screen again.

| What you feel / hear | What it means |
| --- | --- |
| Three short buzzes, rising two-tone | **Pick it up** — you're below the target zone |
| Two long buzzes, falling two-tone | **Ease off** — you're above it |
| Short double-tap, bright ding | **On target** — you're back in the zone |
| N short buzzes, N rising blips | **You're in zone N** (only when no target is set) |
| Double blip + spoken split | Distance or time marker passed |
| Long descending buzz | Strap signal lost |

Every part of it is adjustable in Settings: how often it nudges you, how long a zone has to
hold before it counts, how many beats past a boundary you have to be, and which of
haptics / tones / voice you actually want.

Two settings exist specifically to stop the app nagging you at a zone boundary:

- **Zone must hold for** (default 4 s) — a new zone has to persist before it's accepted
- **Boundary deadband** (default 2 bpm) — you have to clear the line by this much

## Setting up your WHOOP

1. Open the WHOOP app → your device settings
2. Turn on **Broadcast Heart Rate**
3. In Kardio, tap the strap chip → **Link**, and pick WHOOP from the chooser

WHOOP broadcasts to one device at a time, so close anything else that might grab it. Once
linked, Kardio reconnects on its own — including mid-run if the signal drops.

Android needs both Bluetooth **and** Location switched on for the device chooser to find
anything. That's an OS rule for BLE scanning, not a Kardio one.

## Zones

Five zones, set however you like:

- **% Max HR** (default) — 50/60/70/80/90 % of max
- **% HRR** — Karvonen, uses your resting heart rate too
- **LTHR** — Friel's threshold-based bands
- **Manual** — type the numbers yourself

Max HR defaults to the Tanaka estimate (`208 − 0.7 × age`). If you've actually tested yours,
override it — every zone in the app depends on that one number.

## Install it on your phone

Open the deployed URL in **Chrome on Android** and either tap the *Add Kardio to your home
screen* banner or use ⋮ → *Add to Home screen*. It then launches full screen with no browser
chrome and works with no signal.

Installing matters for more than looks: as an installed app it keeps the screen wake lock,
holds audio focus with the screen off, and keeps the Bluetooth link alive in the background.

## Running it locally

```bash
npm install
npm run dev      # http://localhost:5173/Kardio/
npm run build    # generates icons, typechecks, bundles to dist/
```

Web Bluetooth needs a secure context. `localhost` counts; a bare LAN IP does not — to test
on your phone over the network, use an HTTPS tunnel or just deploy.

## Deploying

Live at **https://bmack08.github.io/Kardio/**

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which
builds and publishes `dist/` to GitHub Pages. Pages is configured with
**Settings → Pages → Source: GitHub Actions** — only the compiled bundle is served, never the
source tree (which is what *Deploy from a branch* would do, and it would fail anyway: the
committed `index.html` points at `src/main.tsx`, which no browser can execute).

The site is served from `/Kardio/`, baked in as `base` in `vite.config.ts`. For a root-level
host (Vercel, Netlify, a custom domain) build with `BASE_PATH=/` instead.

## Privacy

There is no backend. No account, no analytics, no network calls except the Google Fonts
stylesheet on first load. Sessions live in IndexedDB and settings in localStorage, both on
your device only. Erasing app data erases everything — export a backup first if you care
about it.

## Honest limits

- **Chrome on Android** is the target. Safari has no Web Bluetooth and no Vibration API, so
  on iOS the strap can only be read through a BLE-capable browser like Bluefy, and haptics
  are unavailable there entirely.
- **Calories are an estimate** from heart rate, weight and age (Keytel). Treat them as a
  trend, not a measurement.
- **GPS is phone GPS.** Distance is filtered for accuracy and jitter, but a treadmill or a
  street of tall buildings will still lie to it. Use indoor mode where GPS won't help.
- **Background audio** on Android survives the screen going off because Kardio holds audio
  focus with a silent keep-alive track. Aggressive battery savers can still suspend it; if
  yours does, exempt Kardio from battery optimisation.

## Layout

```
src/
  lib/        ble · cues · recorder · zones · audio · haptics · speech · geo · db · gpx
  screens/    Today · Live · Summary · History · Settings
  components/ HRRing · Charts · TargetPicker · PairSheet · Ui · Icons
  styles/     app.css — one file, tokens at the top
scripts/      make-icons.mjs — builds every PWA icon from code, no binaries in the repo
```

The interesting file is `lib/cues.ts`. It decides *when* to interrupt you, which is the whole
product.
