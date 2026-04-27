import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    chunkSizeWarningLimit: 1200,

    rollupOptions: {
      output: {
        /* Rolldown (Vite 8) requires manualChunks as a function */
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/gsap'))          return 'vendor-gsap'
          if (id.includes('node_modules/lenis'))         return 'vendor-lenis'
        },
      },
    },
  },
})
