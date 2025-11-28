import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  root: 'src/frontend',
  build: {
    outDir: '../../dist/static',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/libs': 'http://localhost:3000',
      '/version-tag': 'http://localhost:3000'
    }
  }
})
