// @lovable.dev/vite-tanstack-config already includes the following - do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    resolve: {
      alias: [
        // As páginas aprovadas usam a API do react-router-dom; a camada de
        // compatibilidade a implementa sobre o TanStack Router sem alterar o visual.
        // fileURLToPath preserva unidades Windows e decodifica espaços e acentos.
        { find: /^react-router-dom$/, replacement: fileURLToPath(new URL("./src/lib/router-compat.tsx", import.meta.url)) },
      ],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
