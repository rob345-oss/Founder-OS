import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/lib/studio/server/__tests__/**/*.test.ts",
      "src/lib/crm/__tests__/**/*.test.ts",
      "src/lib/marketing/__tests__/**/*.test.ts",
      "../../packages/studio/src/__tests__/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@founder-os/studio": path.resolve(__dirname, "../../packages/studio/src/index.ts"),
    },
  },
});
