/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bloque 7d: sustituye a Create React App (react-scripts 5, sin mantenimiento).
export default defineConfig({
  plugins: [react()],
  build: {
    // Capacitor (capacitor.config.ts → webDir) y Vercel leen de `build/`, como con CRA.
    outDir: 'build',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
