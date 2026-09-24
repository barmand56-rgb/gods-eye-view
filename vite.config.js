import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    allowedHosts: true,
    host: '0.0.0.0',
  },
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
  }
});
