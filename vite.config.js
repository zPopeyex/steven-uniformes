import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: ['b8bd1055b840.ngrok-free.app']
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            'firebase/app',
            'firebase/firestore',
            'firebase/auth',
            'firebase/storage'
          ],
          react: ['react', 'react-dom'],
          vendor: [
            'html5-qrcode',
            'qrcode',
            'html-to-image'
          ]
        },
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  preview: {
    port: 3000,
    strictPort: true
  }
})