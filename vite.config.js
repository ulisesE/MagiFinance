import { defineConfig } from 'vite';

export default defineConfig({
  // Establecer ruta base relativa para que funcione en cualquier subcarpeta de GitHub Pages
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 3000
  }
});
