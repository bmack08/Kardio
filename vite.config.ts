import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this repo at https://<user>.github.io/Kardio/
// Override with BASE_PATH=/ when deploying to a root domain (Vercel, custom domain).
const base = process.env.BASE_PATH ?? '/Kardio/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  server: { host: true, port: 5173 },
})
