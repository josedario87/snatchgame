import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3004,
    allowedHosts: true,
    cors: {
      origin: ['http://localhost:3004', 'http://z590.interno.com:3004']
    },
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true
      },
      '/ws': {
        target: process.env.VITE_DEV_WS_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, '')
      }
    }
  }
})
