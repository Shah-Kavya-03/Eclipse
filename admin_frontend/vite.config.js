import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Proxy /py-api/* to the Python FastAPI backend (port 8001)
      '/py-api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/py-api/, ''),
      },
      // Proxy /node-api/* to the Node.js Express server (port 5000)
      '/node-api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/node-api/, ''),
      },
    },
  },
});
