import { defineConfig } from 'vite';

const V3_API_FROM='window.HangingMediaV3={savePiece,saveProject,start,edit,png,record,html,zip,embed,getProject:()=>clone(project)}';
const V3_API_TO="window.HangingMediaV3={savePiece,saveProject,start,edit,png,record,html,zip,embed,addLayer,blobData,renderLayers,addImageLayer:async(file,type='logo')=>{const data=await blobData(file);addLayer(type,data);return data},getProject:()=>clone(project)}";
const CORE_FROM='const mediaRuntime=new MediaRuntime(),sceneAssets=new SceneAssetRuntime();';
const CORE_TO='const mediaRuntime=new MediaRuntime(),sceneAssets=new SceneAssetRuntime();window.HangingMediaCore={mediaRuntime,sceneAssets};';
const V51_BOOT='function boot(){if(!$(\'#stage\')||!$(\'#authoring-panel\'))return setTimeout(boot,60);initScene()}\nboot();';
const V51_EXTERNAL_API=`function mountExternal(root,animations=[],name='External 3D',report={}){if(customRoot)scene.remove(customRoot);if(mixer)mixer.stopAllAction();clipMap.clear();activeClip='';const wrapper=new THREE.Group();wrapper.name='V5_1_EXTERNAL_ASSET';root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});const box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);const ss=4/Math.max(size.y,.001);root.scale.multiplyScalar(ss);root.position.set(-center.x*ss,-box.min.y*ss,-center.z*ss);wrapper.add(root);customRoot=wrapper;scene.add(customRoot);if(animations?.length){mixer=new THREE.AnimationMixer(root);for(const c of animations)clipMap.set((c.name||'').toLowerCase(),c);playClip('idle')}state.template='custom';persist();syncTemplateSelect();syncVisibility();customRoot.userData.externalAsset={name,report};return report}\nfunction clearExternal(){if(customRoot){scene.remove(customRoot);customRoot=null}if(mixer){mixer.stopAllAction();mixer=null}clipMap.clear();activeClip='';if(state.template==='custom'){state.template='aya';persist();if(!rig){rig=createRig(TEMPLATES.aya);scene.add(rig.root)}syncTemplateSelect();syncVisibility()}}\nfunction getSceneContext(){return{scene,camera,renderer,canvas,shell}}\nwindow.HangingMediaV51Character={mountExternal,clearExternal,loadCustom,getSceneContext};\n${V51_BOOT}`;

export default defineConfig({
  base: './',
  plugins: [{
    name: 'hanging-media-v5-1-entry',
    enforce: 'pre',
    transform(code,id) {
      const clean=id.replaceAll('\\','/');
      if (clean.endsWith('/src/main.js')) {
        if (!code.includes(CORE_FROM)) throw new Error('V5.1 could not expose media core: signature not found');
        return code.replace(CORE_FROM,CORE_TO);
      }
      if (clean.endsWith('/src/v3-studio.js')) {
        if (!code.includes(V3_API_FROM)) throw new Error('V5.1 could not expose V3 layer API: signature not found');
        return code.replace(V3_API_FROM,V3_API_TO);
      }
      if (clean.endsWith('/src/v5-1-character-library.js')) {
        if (!code.includes(V51_BOOT)) throw new Error('V5.1 could not expose external 3D mount API: boot signature not found');
        return code.replace(V51_BOOT,V51_EXTERNAL_API);
      }
      return null;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('</body>', '<script type="module" src="/src/v3-studio.js"></script><script type="module" src="/src/v4-character.js"></script><script type="module" src="/src/v4-character-kinematics.js"></script><script type="module" src="/src/v5-character-3d.js"></script><script type="module" src="/src/v5-1-character-library.js"></script><script type="module" src="/src/v5-1-logo-fix.js"></script><script type="module" src="/src/v5-1-external-assets.js"></script><script type="module" src="/src/v5-1-asset-library-v2.js"></script><script type="module" src="/src/v5-1-phase1-hardening.js"></script><script type="module" src="/src/v5-1-phase1-readiness.js"></script><script type="module" src="/src/v5-1-phase1-persistence.js"></script></body>');
      }
    }
  }],
  build: {
    target: 'es2022',
    sourcemap: true
  }
});
