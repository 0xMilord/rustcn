import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@rustcn/react': path.resolve(__dirname, '../../components'),
      '@rustcn/core': path.resolve(__dirname, '../../bindings/src'),
    },
  },
});
