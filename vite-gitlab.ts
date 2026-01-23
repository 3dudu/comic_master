import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/comic_master/', // 替换为你的实际二级路径：比如仓库名是my-react-proj，就写/base: '/my-react-proj/'
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['3000.code.good365.net','4173.code.good365.net']
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VOLCENGINE_API_KEY': JSON.stringify(env.VOLCENGINE_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              // 拆分React核心全家桶为单独chunk
              reactVendor: ['react', 'react-dom'],
              // 拆分大体积UI组件库（如Antd/MUI/Element-React）
              uiLib: ['lucide-react'],
              // 拆分大体积工具库（如axios/echarts/lodash/moment）
              utilsLib: ['@google/genai'],
            }
          }
        }
      }
    };
});
