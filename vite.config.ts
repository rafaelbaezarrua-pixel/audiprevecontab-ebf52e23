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
    // CORS configurado para permitir apenas origens confiáveis em produção
    cors: mode === 'production' ? {
      origin: process.env.VITE_ALLOWED_ORIGINS?.split(',') || ['https://seu-dominio.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth'],
    } : {
      origin: true,
      credentials: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Headers de segurança no proxy
        headers: {
          'X-Forwarded-Proto': 'https',
        },
      },
      '/fb-api': {
        target: 'http://192.168.100.3:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fb-api/, ''),
        secure: false,
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
