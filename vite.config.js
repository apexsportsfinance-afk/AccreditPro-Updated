import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    hmr: { overlay: true },
    watch: {
      // usePolling removed — it causes memory exhaustion on Windows
      // Native file watching (default) is stable and fast
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
    }
  },
  resolve: {
    alias: { 
      "@": "/src"
    }
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true
  }
});
