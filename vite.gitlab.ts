import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/ai/mandirector-ai/', // 替换为你的实际二级路径：比如仓库名是my-react-proj，就写/base: '/my-react-proj/'
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['3000.code.good365.net','4173.code.good365.net']
      },
      plugins: [
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}']
          },
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          manifest: {
            name: 'AI漫剧工场',
            short_name: 'AI漫剧',
            description: 'AI驱动的漫画创作工具',
            start_url: '/',
            theme_color: '#0e1229',
            background_color: '#0e1229',
            display: 'standalone',
            icons: [
              {
                src: '192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '512x512.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: '512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          devOptions: { enabled: true },
          // 4. 自动注入Manifest和Service Worker到index.html
          injectRegister: 'auto'
        })
      ],
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
