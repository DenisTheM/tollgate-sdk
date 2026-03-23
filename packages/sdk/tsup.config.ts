import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      next: "src/next.ts",
      mcp: "src/mcp.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: true,
    outDir: "dist",
  },
  {
    entry: {
      "cli/index": "cli/index.ts",
    },
    format: ["esm"],
    banner: { js: "#!/usr/bin/env node" },
    outDir: "dist",
  },
]);
