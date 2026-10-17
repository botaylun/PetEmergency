import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to Laravel backend (port 8001)
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      // CSRF cookie endpoint for Laravel session auth
      '/sanctum': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      // Storage files (uploaded media)
      '/storage': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
