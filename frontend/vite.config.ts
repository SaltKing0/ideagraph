import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ideas': 'http://localhost:8000',
      '/connections': 'http://localhost:8000',
      '/graph': 'http://localhost:8000',
      '/stats': 'http://localhost:8000',
    }
  }
})
