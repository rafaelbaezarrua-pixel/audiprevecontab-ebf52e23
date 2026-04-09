import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/fb-api': {
        target: 'http://192.168.100.3:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fb-api/, ''),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("pdfjs-dist") || id.includes("pdf-lib") || id.includes("jspdf") || id.includes("@signpdf")) {
              return "vendor-pdf";
            }
            if (id.includes("xlsx")) {
              return "vendor-excel";
            }
            if (id.includes("recharts") || id.includes("d3")) {
              return "vendor-charts";
            }
          }
        },
      },
    },
  },
}));
