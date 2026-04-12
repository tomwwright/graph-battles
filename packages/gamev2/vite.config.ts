import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/v2/',
  optimizeDeps: {
    include: ['@battles/models'],
  },
  build: {
    commonjsOptions: {
      include: [/models/, /node_modules/],
    },
  },
});
