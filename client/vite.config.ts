import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vercel/Web uchun '/' (absolute path) kerak. Android uchun esa './' (relative).
  base: process.env.VITE_MOBILE === 'true' ? './' : '/',
})
