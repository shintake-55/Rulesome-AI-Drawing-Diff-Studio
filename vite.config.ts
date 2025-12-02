import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // 環境変数をすべて読み込む
    const env = loadEnv(mode, '.', '');
    
    return {
      // リポジトリ名に合わせて設定
      base: '/Rulesome-AI-Drawing-Diff-Studio/',
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // ▼▼▼ ここが修正ポイント！ ▼▼▼
        // GitHub Actionsで設定した "VITE_" 付きのキーを確実に読み込むように変更しました
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'esnext',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              pdf: ['pdfjs-dist']
            }
          }
        }
      }
    };
});
