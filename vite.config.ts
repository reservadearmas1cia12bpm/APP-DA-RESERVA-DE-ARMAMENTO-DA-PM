import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      external: ['jszip'] // Garante que nenhum jszip seja incluído
    }
  },
  define: {
    'process.env': {}
  }
});
