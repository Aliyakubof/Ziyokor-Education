import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'masked-icon.svg', 'logo.jpeg'],
      manifest: {
        name: 'Ziyokor Education',
        short_name: 'Ziyokor',
        description: 'Ziyokor Education learning platform',
        theme_color: '#0056b3',
        icons: [
          {
            src: 'logo.jpeg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: 'logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  // Vercel buildlari uchun '/' ishlatamiz, aks holda (Capacitor/Local) './'
  base: process.env.VERCEL ? '/' : './',
})
