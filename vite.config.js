import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/focus-flow-ai/',
  build: {
    outDir: '..',
    assetsDir: 'assets',
    emptyOutDir: false, // Don't empty root dir (has other files)
  },
})
