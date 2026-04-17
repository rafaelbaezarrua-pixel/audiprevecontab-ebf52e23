// vite.config.ts
import { defineConfig } from "file:///C:/Users/rafae/OneDrive/Desktop/sistema/audiprevecontab-ebf52e23/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/rafae/OneDrive/Desktop/sistema/audiprevecontab-ebf52e23/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/rafae/OneDrive/Desktop/sistema/audiprevecontab-ebf52e23/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\rafae\\OneDrive\\Desktop\\sistema\\audiprevecontab-ebf52e23";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    },
    // CORS configurado para permitir apenas origens confiáveis em produção
    cors: mode === "production" ? {
      origin: process.env.VITE_ALLOWED_ORIGINS?.split(",") || ["https://seu-dominio.com"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Auth"]
    } : {
      origin: true,
      credentials: true
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        // Headers de segurança no proxy
        headers: {
          "X-Forwarded-Proto": "https"
        }
      },
      "/fb-api": {
        target: "http://192.168.100.3:8081",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/fb-api/, ""),
        secure: false
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    chunkSizeWarningLimit: 1e3,
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
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxyYWZhZVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXHNpc3RlbWFcXFxcYXVkaXByZXZlY29udGFiLWViZjUyZTIzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxyYWZhZVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXHNpc3RlbWFcXFxcYXVkaXByZXZlY29udGFiLWViZjUyZTIzXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9yYWZhZS9PbmVEcml2ZS9EZXNrdG9wL3Npc3RlbWEvYXVkaXByZXZlY29udGFiLWViZjUyZTIzL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICAgIGhtcjoge1xyXG4gICAgICBvdmVybGF5OiBmYWxzZSxcclxuICAgIH0sXHJcbiAgICAvLyBDT1JTIGNvbmZpZ3VyYWRvIHBhcmEgcGVybWl0aXIgYXBlbmFzIG9yaWdlbnMgY29uZmlcdTAwRTF2ZWlzIGVtIHByb2R1XHUwMEU3XHUwMEUzb1xyXG4gICAgY29yczogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nID8ge1xyXG4gICAgICBvcmlnaW46IHByb2Nlc3MuZW52LlZJVEVfQUxMT1dFRF9PUklHSU5TPy5zcGxpdCgnLCcpIHx8IFsnaHR0cHM6Ly9zZXUtZG9taW5pby5jb20nXSxcclxuICAgICAgY3JlZGVudGlhbHM6IHRydWUsXHJcbiAgICAgIG1ldGhvZHM6IFsnR0VUJywgJ1BPU1QnLCAnUFVUJywgJ0RFTEVURScsICdQQVRDSCcsICdPUFRJT05TJ10sXHJcbiAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJywgJ1gtQXV0aCddLFxyXG4gICAgfSA6IHtcclxuICAgICAgb3JpZ2luOiB0cnVlLFxyXG4gICAgICBjcmVkZW50aWFsczogdHJ1ZSxcclxuICAgIH0sXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICAgIC8vIEhlYWRlcnMgZGUgc2VndXJhblx1MDBFN2Egbm8gcHJveHlcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnWC1Gb3J3YXJkZWQtUHJvdG8nOiAnaHR0cHMnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgICcvZmItYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xOTIuMTY4LjEwMC4zOjgwODEnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvZmItYXBpLywgJycpLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW3JlYWN0KCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHtcclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwicGRmanMtZGlzdFwiKSB8fCBpZC5pbmNsdWRlcyhcInBkZi1saWJcIikgfHwgaWQuaW5jbHVkZXMoXCJqc3BkZlwiKSB8fCBpZC5pbmNsdWRlcyhcIkBzaWducGRmXCIpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXBkZlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcInhsc3hcIikpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItZXhjZWxcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJyZWNoYXJ0c1wiKSB8fCBpZC5pbmNsdWRlcyhcImQzXCIpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWNoYXJ0c1wiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSkpO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdZLFNBQVMsb0JBQW9CO0FBQzdaLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsSUFDWDtBQUFBO0FBQUEsSUFFQSxNQUFNLFNBQVMsZUFBZTtBQUFBLE1BQzVCLFFBQVEsUUFBUSxJQUFJLHNCQUFzQixNQUFNLEdBQUcsS0FBSyxDQUFDLHlCQUF5QjtBQUFBLE1BQ2xGLGFBQWE7QUFBQSxNQUNiLFNBQVMsQ0FBQyxPQUFPLFFBQVEsT0FBTyxVQUFVLFNBQVMsU0FBUztBQUFBLE1BQzVELGdCQUFnQixDQUFDLGdCQUFnQixpQkFBaUIsUUFBUTtBQUFBLElBQzVELElBQUk7QUFBQSxNQUNGLFFBQVE7QUFBQSxNQUNSLGFBQWE7QUFBQSxJQUNmO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUE7QUFBQSxRQUVSLFNBQVM7QUFBQSxVQUNQLHFCQUFxQjtBQUFBLFFBQ3ZCO0FBQUEsTUFDRjtBQUFBLE1BQ0EsV0FBVztBQUFBLFFBQ1QsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsYUFBYSxFQUFFO0FBQUEsUUFDL0MsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLGlCQUFpQixnQkFBZ0IsQ0FBQyxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQzlFLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLHVCQUF1QjtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWMsQ0FBQyxPQUFPO0FBQ3BCLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixnQkFBSSxHQUFHLFNBQVMsWUFBWSxLQUFLLEdBQUcsU0FBUyxTQUFTLEtBQUssR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsVUFBVSxHQUFHO0FBQzFHLHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLEdBQUcsU0FBUyxNQUFNLEdBQUc7QUFDdkIscUJBQU87QUFBQSxZQUNUO0FBQ0EsZ0JBQUksR0FBRyxTQUFTLFVBQVUsS0FBSyxHQUFHLFNBQVMsSUFBSSxHQUFHO0FBQ2hELHFCQUFPO0FBQUEsWUFDVDtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFsicGF0aCJdCn0K
