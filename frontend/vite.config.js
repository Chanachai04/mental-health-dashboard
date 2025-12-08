import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss(),],
  server: {
    host: '0.0.0.0', // ให้คนอื่นในเครือข่ายเข้าถึงได้
    port: 5173,
    strictPort: true,
    https: false, // บังคับใช้ HTTP ไม่ใช่ HTTPS
    hmr: {
      clientPort: 5173, // ใช้ port เดียวกับ server
    }
  }
})
