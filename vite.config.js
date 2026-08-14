import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'hanging-media-v3-entry',
    transformIndexHtml() {
      return {
        tags: [{
          tag: 'script',
          attrs: { type: 'module', src: './src/v3-studio.js' },
          injectTo: 'body'
        }]
      };
    }
  }],
  build: {
    target: 'es2022',
    sourcemap: true
  }
});
