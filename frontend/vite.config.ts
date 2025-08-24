import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist'
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
    include: ['@react-three/rapier > @dimforge/rapier3d-compat']
  },
  worker: {
    format: 'es'
  }
})