import { defineConfig } from 'vite';

const V3_API_FROM='window.HangingMediaV3={savePiece,saveProject,start,edit,png,record,html,zip,embed,getProject:()=>clone(project)}';
const V3_API_TO="window.HangingMediaV3={savePiece,saveProject,start,edit,png,record,html,zip,embed,addLayer,blobData,renderLayers,addImageLayer:async(file,type='logo')=>{const data=await blobData(file);addLayer(type,data);return data},getProject:()=>clone(project)}";

export default defineConfig({
  base: './',
  plugins: [{
    name: 'hanging-media-v5-1-entry',
    enforce: 'pre',
    transform(code,id) {
      if (id.replaceAll('\\','/').endsWith('/src/v3-studio.js')) {
        if (!code.includes(V3_API_FROM)) throw new Error('V5.1 could not expose V3 layer API: signature not found');
        return code.replace(V3_API_FROM,V3_API_TO);
      }
      return null;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('</body>', '<script type="module" src="/src/v3-studio.js"></script><script type="module" src="/src/v4-character.js"></script><script type="module" src="/src/v4-character-kinematics.js"></script><script type="module" src="/src/v5-character-3d.js"></script><script type="module" src="/src/v5-1-character-library.js"></script><script type="module" src="/src/v5-1-logo-fix.js"></script></body>');
      }
    }
  }],
  build: {
    target: 'es2022',
    sourcemap: true
  }
});
