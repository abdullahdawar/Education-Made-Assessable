import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [fileURLToPath(new URL('.', import.meta.url))],
      deny: ['**/.env', '**/.env.*', '**/*.{crt,pem}', '**/.git/**', '**/*.pdf', '**/output/**', '**/curriculum/**'],
    },
    proxy: {
      '/api': {
        target: process.env.EMA_API_ORIGIN || 'http://127.0.0.1:8080',
        changeOrigin: false,
      },
    },
  },
})
