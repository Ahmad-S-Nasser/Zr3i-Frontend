import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The dev server runs on 3033; the API must allow http://localhost:3033 in Cors:Origins.
  server: { port: 3033, strictPort: true },
});
