import path from 'path';
import { fileURLToPath } from 'url'; // ← これを追加
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// ▼▼▼ この2行を追加（最新のJavaScriptでパスを扱うためのおまじない） ▼▼▼
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // リポジトリ名に合わせて設定（変更不要）
      base: '/Rulesome-AI-Drawing-Diff-Studio/',
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // PDFライブラリなどが最新の機能を使うため、ターゲットを新しめに設定
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
