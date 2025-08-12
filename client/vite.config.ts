import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3004,
    allowedHosts: ['z590.interno.com'],
    cors: {
      origin: ['http://localhost:3004', 'http://z590.interno.com:3004']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})