import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 3000,
    allowedHosts: [
      "code-review-suite.preview.emergentagent.com",
      "code-review-suite.cluster-0.preview.emergentcf.cloud",
      "localhost",
      ".preview.emergentagent.com",
      ".preview.emergentcf.cloud"
    ],
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
