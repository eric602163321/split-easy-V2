// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from "path"; // 如果你有用 shadcn 通常會有這行

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 有新版本時自動更新
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'], // 靜態資源
      manifest: {
        name: '小團分帳 Pro',
        short_name: 'SEP',
        description: '零打字記帳，輕鬆分帳',
        theme_color: '#ffffff', // 頂部狀態列的顏色
        background_color: '#ffffff', // 啟動畫面的背景色
        display: 'standalone', // 🌟 靈魂所在！這行會隱藏 Safari/Chrome 的網址列
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
