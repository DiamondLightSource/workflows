import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const externalDeps = [
  "react",
  "react-dom",
  "@emotion/react",
  "@emotion/styled",
  "@mui/material",
  "@mui/icons-material",
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "lib/main.ts"),
      fileName: "workflows-lib-shared",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: (id) =>
        externalDeps.some((dep) => id === dep || id.startsWith(`${dep}/`)),
    },
  },
});
