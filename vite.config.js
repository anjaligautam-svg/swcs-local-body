import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Lightweight SPA — no router dependency; navigation is in-memory state.
// base: '/' in dev (localhost root) and '/swcs-local-body/' for the production
// build so assets resolve on the GitHub Pages project site.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/swcs-local-body/' : '/',
  plugins: [react()],
  server: { host: true, port: 5179, strictPort: true },
}))
