import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Kennung dieses Builds: steckt im Code und in version.json. Weicht die Datei auf dem Server ab, weiß die App, dass es eine neue Version gibt.
const BUILD_ID = new Date().toISOString()

// Auf GitHub Pages liegt die Seite unter /<repo>/ – die Action setzt VITE_BASE.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
      },
    },
  ],
  test: { environment: 'node' },
})
