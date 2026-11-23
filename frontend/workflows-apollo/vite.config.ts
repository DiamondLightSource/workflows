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
      entry: resolve(import.meta.dirname, "lib/main.ts"),
      fileName: "workflows-apollo",
      formats: ["es", "cjs"],
    },
    rolldownOptions: {
      // Might need to add some extras to this
      external: (id) =>
        externalDeps.some((dep) => id === dep || id.startsWith(`${dep}/`)),
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDom",
        },
      },
    },
  },
});
