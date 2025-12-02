import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// パス設定のための「おまじない」（ESM対応）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // 環境変数を読み込む
    const env = loadEnv(mode, '.', '');
    
    return {
      // 重要：ここがGitHubのリポジトリ名と一致していないとホワイトアウトします
      // もしリポジトリ名が違う場合は、'/リポジトリ名/' に書き換えてください
      base: '/Rulesome-AI-Drawing-Diff-Studio/',
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // 重要：アプリ内で process.env.API_KEY を使えるようにする設定
        // GitHub Secrets (VITE_GEMINI_API_KEY) を読み込みます
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'esnext', // 最新のJavaScript機能（Top-level await等）を許可
        chunkSizeWarningLimit: 1000,
