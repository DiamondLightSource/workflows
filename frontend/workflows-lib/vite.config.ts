import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import relay from "vite-plugin-relay"
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
plugins: [relay, react()],
build: {
lib: {
entry: resolve(__dirname, "lib/main.ts"),
name: "workflows-lib",
fileName: "workflows-lib",
},
rollupOptions: {
external: ["react", "react-dom"],
output: {
globals: {
react: "React",
"react-dom": "ReactDom",
},
},
},
},
});

