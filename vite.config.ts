import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';
import tanstackRouter from '@tanstack/router-plugin/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const host = process.env.TAURI_DEV_HOST;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    stylex.vite({
      useCSSLayers: true,
      dev: process.env.NODE_ENV === 'development',
      runtimeInjection: false,
      aliases: {
        '@/*': path.join(__dirname, 'src/*'),
      },
      unstable_moduleResolution: {
        type: 'commonJS',
        rootDir: __dirname,
      },
      cssInjectionTarget: (fileName: string) => fileName.includes('globals'),
    }),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      quoteStyle: 'single',
      semicolons: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // Avoid a StyleX/Vite crawl deadlock that never commits `.vite/deps`.
    holdUntilCrawlEnd: false,
    exclude: ['@tauri-apps/api'],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        floatingBar: path.resolve(__dirname, 'floating-bar.html'),
      },
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**', '**/node_modules/**', '**/dist/**'],
      include: ['src/**/*'],
    },
  },
});
