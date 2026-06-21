import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
  plugins: [
    react(),
    // Compress all images in /public at build time
    ViteImageOptimizer({
      // JPEG → compress to ~80 quality
      jpg: { quality: 80 },
      jpeg: { quality: 80 },
      // PNG → lossless squeeze + palette reduction
      png: { quality: 80 },
      // WebP → already small; light touch
      webp: { quality: 82 },
      // GIF → strip metadata
      gif: { optimizationLevel: 3 },
      // SVG → clean markup
      svg: { multipass: true, plugins: [{ name: 'preset-default' }] },
      // Don't log each file; summary is enough
      logStats: true,
    }),
  ],

  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },

  build: {
    // Target modern browsers for smaller output (no legacy polyfills)
    target: 'es2020',
    // Raise inline limit to 0 — never inline large assets as base64
    assetsInlineLimit: 4096,
    // Split JS into meaningful chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'react-dom'
          if (id.includes('node_modules/react/')) return 'react'
          if (id.includes('node_modules/framer-motion')) return 'motion'
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router/')) return 'router'
        },
      },
    },
    // Enable source-map only in CI/staging, not prod — saves ~30% bundle size
    sourcemap: false,
  },
})
