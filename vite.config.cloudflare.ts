import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['3000.code.good365.net','4173.code.good365.net'],
        watch: {
          // 排除node_modules（依赖包无需热更新，占大量监视器）
          // 排除dist（构建产物目录）、.git（版本控制目录）、*.log（日志文件）等
          ignored: [
            /node_modules/,
            /dist/,
            /\.git/,
            /\.log$/,
            /tmp/,
            // 可根据项目情况添加其他无需监听的目录，如：/public/assets/large-files
          ]
        }
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
        outDir: 'build',
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
