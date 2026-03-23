import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import relay from "vite-plugin-relay";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [relay, react()],
  build: {
    lib: {
      entry: resolve(__dirname, "lib/main.ts"),
      name: "relay-workflows-lib",
      fileName: "relay-workflows-lib",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react-relay"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDom",
          "react-relay": "ReactRelay",
        },
      },
    },
  },
});
