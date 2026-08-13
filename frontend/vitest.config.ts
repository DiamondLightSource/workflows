import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "workflows-lib",
      "workflows-lib-shared",
      "relay-workflows-lib",
      "dashboard",
    ],
  },
});
