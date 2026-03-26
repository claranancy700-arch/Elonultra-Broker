import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '..',  // Load .env from parent directory (project root)
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  },
  build: {
    cssMinify: false,  // Disable CSS minification to avoid syntax warnings
  },
  define: {
    // Replace API base URL placeholder in admin.html during build
    __API_BASE_URL__: JSON.stringify(
      process.env.VITE_API_URL || 'http://localhost:5001/api'
    ),
  },
})
