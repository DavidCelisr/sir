import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
server: {
    // Todo lo que empiece por /api se reenvía al backend (solo en desarrollo)
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
