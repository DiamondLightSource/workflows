import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import relay from "vite-plugin-relay";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [relay, react()],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "lib/main.ts"),
      formats: ["es"],
      fileName: "workflows-lib",
    },
    rolldownOptions: {
      external: [
        "react",
        "react-dom",
        "react-relay",
        "@apollo/client",
        "@apollo/client/react",
        "@apollo/client/link/subscriptions",
        "@apollo/client/utilities",
      ],
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
