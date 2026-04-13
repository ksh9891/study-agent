import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    name: "eval",
    include: ["**/*.test.ts"],
    root: __dirname,
    testTimeout: 60_000,
  },
});
