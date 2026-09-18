import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default defineConfig({
  ...viteConfig,
  mode: "test",
  test: {
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    environment: "jsdom",
  },
});
