import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5000,
    strictPort: true,
    proxy: {
      "/auth": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/chat": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/standings": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/hitters": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/pitchers": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/players": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/games": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/schedule": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/teams": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/glossary": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/stadiums": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/visits": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/favorites": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/weather": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/recommendations": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
