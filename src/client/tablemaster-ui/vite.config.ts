import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/v1/bookings': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      '/api/v1/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api/v1/restaurant': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/v1/floor-plans': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/v1/tables': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/v1/menu': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/api/v1/payments': {
        target: 'http://localhost:8084',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
