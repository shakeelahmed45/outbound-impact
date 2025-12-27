import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ✅ OPTIMIZATION: Build optimizations (without terser)
  build: {
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libs
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Lucide icons in separate chunk
          'icons': ['lucide-react'],
          // Axios in separate chunk
          'api': ['axios'],
        },
      },
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
    // Use default minification (esbuild - faster than terser)
    minify: 'esbuild',
  },
  
  // ✅ OPTIMIZATION: Development server optimizations
  server: {
    // Enable HMR for faster development
    hmr: true,
    // Faster file watching
    watch: {
      usePolling: false,
    },
  },
  
  // ✅ OPTIMIZATION: Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'lucide-react'],
  },
})
