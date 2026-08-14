import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'hanging-media-v5-1-entry',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('</body>', '<script type="module" src="/src/v3-studio.js"></script><script type="module" src="/src/v4-character.js"></script><script type="module" src="/src/v4-character-kinematics.js"></script><script type="module" src="/src/v5-character-3d.js"></script><script type="module" src="/src/v5-1-character-library.js"></script></body>');
      }
    }
  }],
  build: {
    target: 'es2022',
    sourcemap: true
  }
});
