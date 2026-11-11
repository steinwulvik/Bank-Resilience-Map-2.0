import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relativ base gjør at appen virker uansett hvilken mappe den publiseres fra.
// Biblioteker legges i egne filer med innholdshash: de endres sjelden, så nettleseren kan
// gjenbruke dem fra cache når bare appkoden er oppdatert.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          return /[\\/](@xyflow|d3-|classcat|zustand)/.test(id) ? 'flow' : 'vendor';
        },
      },
    },
  },
});
