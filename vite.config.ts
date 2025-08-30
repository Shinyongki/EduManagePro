import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      // Node.js 모듈 polyfill 완전 비활성화
      external: ['path', 'fs', 'os', 'crypto', 'util', 'events', 'stream', 'buffer', 'url'],
    },
  },
  define: {
    // Node.js 전역 변수 제거
    global: 'globalThis',
    process: '{}',
    Buffer: '{}',
  },
  optimizeDeps: {
    // Node.js 모듈 최적화에서 제외
    exclude: ['path', 'fs', 'os', 'crypto', 'util', 'events', 'stream', 'buffer', 'url']
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3016",
        changeOrigin: true,
      },
    },
  },
});
