import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "workflows-lib",
      "workflows-lib-2",
      "workflows-lib-shared",
      "relay-workflows-lib",
      "dashboard",
      "dashboard-2",
    ],
  },
});
