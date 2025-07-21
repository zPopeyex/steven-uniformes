import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['all'],
  },
  build: {
    rollupOptions: {
    output: {
      manualChunks: {
        firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
        react: ['react', 'react-dom'],
      }
    },
    outDir: 'dist', // Esta es la carpeta que genera Vite
    chunkSizeWarningLimit: 1000, // Para evitar warnings de tamaño
  }
    

  }
})
