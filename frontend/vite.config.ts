import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

function buildCsp(apiUrl: string, wsUrl: string, dev: boolean) {
  const scriptSrc = dev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://tile.openstreetmap.org",
    `connect-src 'self' ${apiUrl} ${wsUrl} https://tile.openstreetmap.org`,
    "worker-src 'self' blob:",
    "font-src 'self' data:",
  ].join("; ");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:3000";
  const wsUrl = env.VITE_WS_URL || "ws://localhost:3000/ws";
  const mapCsp = buildCsp(apiUrl, wsUrl, false);
  const devCsp = buildCsp(apiUrl, wsUrl, true);

  return {
    plugins: [
      tailwindcss(),
      tsconfigPaths(),
      tanstackStart({ server: { entry: "server" } }),
      viteReact(),
      nitro({
        preset: "node-server",
        routeRules: {
          "/**": {
            headers: {
              "Content-Security-Policy": mapCsp,
            },
          },
        },
      }),
    ],
    server:
      mode === "development"
        ? {
            port: 5173,
            strictPort: true,
            headers: {
              "Content-Security-Policy": devCsp,
            },
          }
        : undefined,
  };
});
