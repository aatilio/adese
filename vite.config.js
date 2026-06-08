import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ── Build optimizations ──────────────────────────────────
  build: {
    // Split vendor chunks to improve cache efficiency
    rollupOptions: {
      output: {
        manualChunks: {
          'qr-vendor':     ['qrcode.react', 'html5-qrcode'],
          'xlsx-vendor':   ['xlsx'],
          'charts-vendor': ['recharts'],
          'icons-vendor':  ['lucide-react'],
        },
      },
    },
    // Increase inline limit for small assets (fonts, tiny SVGs)
    assetsInlineLimit: 4096,
    // Minify with esbuild (default, fastest)
    minify: 'esbuild',
    // Remove console.* and debugger statements in production
    esbuildOptions: {
      drop: ['console', 'debugger'],
    },
    // Warn when a chunk exceeds 600 KB
    chunkSizeWarningLimit: 600,
  },

  // ── Dev server ──────────────────────────────────────────
  server: {
    host: true,
    proxy: {
      '/api/calculate': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
    },
  },
});
