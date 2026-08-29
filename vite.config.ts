import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// StageEgo - AI Performance Coaching Platform
export default defineConfig({
  plugins: [react()],
  build: {
    // Improve chunking for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'icons': ['lucide-react'],
        },
      },
    },
    // Minify aggressively for production
    minify: 'esbuild',
    sourcemap: false,
    // Optimize for production
    target: 'es2020',
    cssCodeSplit: true,
  },
  server: {
    // Faster dev experience
    port: 5173,
    host: true,
    open: false,
  },
  preview: {
    port: 4173,
    host: true,
  },
})
