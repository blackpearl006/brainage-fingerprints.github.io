import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/brainage-fingerprints.github.io/",
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
