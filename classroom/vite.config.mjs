import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/static/classroom/",
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    proxy: { '/api/account': { target: 'https://puyadao.top', changeOrigin: true } },
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  preview: { proxy: { '/api/account': { target: 'https://puyadao.top', changeOrigin: true } } },
  plugins: [react()],
});
