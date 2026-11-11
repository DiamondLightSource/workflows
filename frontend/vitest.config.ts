import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "apollo-workflows-lib",
      "workflows-lib",
      "workflows-lib-2",
      "workflows-lib-shared",
      "relay-workflows-lib",
      "dashboard",
      "dashboard-2",
    ],
  },
});
