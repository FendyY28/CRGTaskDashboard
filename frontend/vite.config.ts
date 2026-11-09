/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// Resolver ids are always posix-style (`D:/repo/src/...`), even on Windows, so
// compare against the normalised path rather than a `path.resolve` string.
const posix = (file: string) => path.resolve(__dirname, file).replace(/\\/g, "/");
const apiServicePath = posix("./src/app/services/api.ts");
const demoApiPath = path.resolve(__dirname, "./src/app/dev/demoApi.ts");

/** Rewrites every `services/api` import to the in-memory demo client. */
function demoApiAlias(): Plugin {
  return {
    name: "crg-demo-api-alias",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!/(^|\/)services\/api$/.test(source)) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (resolved?.id !== apiServicePath) return null;
      // Returning a new absolute id would be treated as "external" on Windows
      // unless it keeps the resolver's posix form.
      return demoApiPath.replace(/\\/g, "/");
    },
  };
}

export default defineConfig(({ mode }) => {
  // `npm run build:demo` runs `vite build --mode demo`. In that mode the app is
  // rewired to a self-contained demo: static files only, no backend.
  const isDemo = mode === "demo";

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
      // Demo build: swap the real HTTP client for the in-memory one. Vite's
      // `resolve.alias` compares import specifiers, never resolved file paths,
      // so the swap has to resolve the import first (see demoApiAlias).
      isDemo && demoApiAlias(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: isDemo
      ? {
          outDir: "dist-demo",
          rollupOptions: { input: path.resolve(__dirname, "./demo.html") },
        }
      : undefined,
    optimizeDeps: {
      exclude: ["class-variance-authority", "tailwind-merge", "clsx"],
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ["**/*.svg", "**/*.csv"],

    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
    },
  };
});
