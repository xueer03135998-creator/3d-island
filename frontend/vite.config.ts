import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tracker from 'vite-plugin-tracker';
import observe from 'vite-plugin-observe';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      // tracker / observe 必须排在 react() 之前，顺序不可调换
      tracker({ baseUrl: env.VITE_API_BASE_URL || 'http://localhost:8090' }),
      observe({ serverPrefix: env.VITE_BASE_PATH || '/' }),
      react(),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    css: {
      // PostCSS 走内联配置，不用 postcss.config.js —— 工程是 ESM-only，禁止 .js 源码。
      // tailwindcss() 不传参时自动加载同级 tailwind.config.ts
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
    build: {
      rollupOptions: {
        output: {
          // 分包：three / react 独立 vendor 块 → 并行下载 + 长缓存，提升加载效率
          manualChunks: (id: string) => {
            if (id.includes('node_modules/three')) {
              return 'three';
            }
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/scheduler')
            ) {
              return 'react';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      port: 8070,
      host: '0.0.0.0',
      allowedHosts: (env.VITE_ALLOWED_HOSTS || 'localhost').split(','),
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8090',
          changeOrigin: true,
        },
      },
    },
  };
});
