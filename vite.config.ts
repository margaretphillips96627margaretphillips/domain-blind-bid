import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import fs from 'fs';

// Custom plugin to serve WASM files with correct MIME type
function wasmPlugin(): Plugin {
  return {
    name: 'wasm-mime-type',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          // Serve WASM file from public directory
          const wasmPath = path.join(process.cwd(), 'public', req.url.split('/').pop()!);
          if (fs.existsSync(wasmPath)) {
            res.setHeader('Content-Type', 'application/wasm');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            fs.createReadStream(wasmPath).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
// WASM files are manually copied to public/ directory
// Run: cp node_modules/@zama-fhe/relayer-sdk/lib/*.wasm public/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Required headers for FHE SDK (SharedArrayBuffer support)
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    fs: {
      strict: false,
    },
  },
  plugins: [
    react(),
    nodePolyfills(),
    wasmPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
  // Enable node polyfills for ethers.js
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
    include: ['keccak'],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  worker: {
    format: 'es',
  },
}));
