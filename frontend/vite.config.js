import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import fs from "fs";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  let pkgVersion = "1.0.0";
  try {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
    );
    pkgVersion = pkgJson.version || pkgVersion;
  } catch {
    /* ignore */
  }

  // Derive API origin for dev proxy if VITE_API_URL includes /api suffix
  const apiBase = env.VITE_API_URL || "http://localhost:5001/api";
  const apiOrigin = apiBase.replace(/\/?api\/?$/, "");

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(pkgVersion),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    server: {
      port: 3000,
      host: true,
      cors: true,
      proxy: {
        "/api": {
          target: apiOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
      cors: true,
    },
    build: {
      outDir: "dist",
      sourcemap: mode === "development",
      // Use default esbuild minifier (fast, no extra dependency)
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
            grid: ["ag-grid-community", "ag-grid-react"],
            utils: ["axios"],
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split(".");
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/css/i.test(ext)) {
              return `assets/css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
        },
      },
      chunkSizeWarningLimit: 1000,
      assetsInlineLimit: 4096,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@services": path.resolve(__dirname, "./src/services"),
        "@contexts": path.resolve(__dirname, "./src/contexts"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@pages": path.resolve(__dirname, "./src/pages"),
      },
    },
    envPrefix: "VITE_",
    css: {
      devSourcemap: mode === "development",
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "axios",
        "ag-grid-community",
        "ag-grid-react",
      ],
    },
  };
});
