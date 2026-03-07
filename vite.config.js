import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, "public"),
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
