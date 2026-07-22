import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Tests run in plain Node, not inside Next.js's server compilation
      // context — server-only normally relies on Next's webpack config to
      // no-op it there. Every file that imports it in this project is
      // genuinely server-only by design; this alias just lets vitest
      // import them for testing without needing the full Next.js
      // toolchain, matching what next build already guarantees for real.
      "server-only": path.resolve(__dirname, "vitest.server-only-stub.ts"),
    },
  },
});
