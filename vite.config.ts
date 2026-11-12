import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Tauri: port tetap (devUrl di tauri.conf.json), tanpa clear screen agar galat Rust tetap terlihat.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    // /mnt/* (WSL drvfs) tidak mengirim event file → polling bila diminta.
    watch: { ignored: ['**/src-tauri/**'], ...(process.env.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true, interval: 500 } : {}) },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // WebView2 (Chromium) di Windows & WKWebView (Safari 15+) di macOS.
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome110' : 'safari15',
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 600,
  },
});
