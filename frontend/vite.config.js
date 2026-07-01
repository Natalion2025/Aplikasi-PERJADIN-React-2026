import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173, // The port your frontend runs on
    proxy: {
      // Proxy API requests
      '/api': {
        target: 'http://localhost:3000', // Your backend server port
        changeOrigin: true,
      },
      // Proxy static file requests (for user avatars, etc.)
      '/uploads': {
        target: 'http://localhost:3000', // Your backend server port
        changeOrigin: true,
      },
    },
  },
});
