import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/health': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})