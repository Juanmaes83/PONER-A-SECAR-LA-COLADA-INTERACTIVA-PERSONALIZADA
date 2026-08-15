import { defineConfig } from 'vite';

const V3_API_FROM='window.HangingMediaV3={savePiece,saveProject,start,edit,png,record,html,zip,embed,getProject:()=>clone(project)}';
const V3_API_TO="window.HangingMediaV3={savePiece,saveProject,start,edit,png,record,html,zip,embed,addLayer,blobData,renderLayers,addImageLayer:async(file,type='logo')=>{const data=await blobData(file);addLayer(type,data);return data},getProject:()=>clone(project)}";
const CORE_FROM='const mediaRuntime=new MediaRuntime(),sceneAssets=new SceneAssetRuntime();';
const CORE_TO='const mediaRuntime=new MediaRuntime(),sceneAssets=new SceneAssetRuntime();window.HangingMediaCore={mediaRuntime,sceneAssets};';
const V51_BOOT='function boot(){if(!$(\'#stage\')||!$(\'#authoring-panel\'))return setTimeout(boot,60);initScene()}\nboot();';
const V51_EXTERNAL_API=`function mountExternal(root,animations=[],name='External 3D',report={}){if(customRoot)scene.remove(customRoot);if(mixer)mixer.stopAllAction();clipMap.clear();activeClip='';const wrapper=new THREE.Group();wrapper.name='V5_1_EXTERNAL_ASSET';root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});const box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);const ss=4/Math.max(size.y,.001);root.scale.multiplyScalar(ss);root.position.set(-center.x*ss,-box.min.y*ss,-center.z*ss);wrapper.add(root);customRoot=wrapper;scene.add(customRoot);if(animations?.length){mixer=new THREE.AnimationMixer(root);for(const c of animations)clipMap.set((c.name||'').toLowerCase(),c);playClip('idle')}state.template='custom';persist();syncTemplateSelect();syncVisibility();customRoot.userData.externalAsset={name,report};return report}\nfunction clearExternal(){if(customRoot){scene.remove(customRoot);customRoot=null}if(mixer){mixer.stopAllAction();mixer=null}clipMap.clear();activeClip='';if(state.template==='custom'){state.template='aya';persist();if(!rig){rig=createRig(TEMPLATES.aya);scene.add(rig.root)}syncTemplateSelect();syncVisibility()}}\nfunction getSceneContext(){return{scene,camera,renderer,canvas,shell}}\nfunction setEditorLocked(locked){if(locked){dragging=false;targetEffort=.035;effort=.035;narrative='idle';wheelUntil=0;releaseAt=0;satisfactionUntil=0;if(canvas){canvas.dataset.state='idle';canvas.dataset.effort='0.035'}}else if(canvas&&canvas.dataset.state==='idle'){narrative='idle'}return{locked:!!locked,state:narrative,effort}}\nwindow.HangingMediaV51Character={mountExternal,clearExternal,loadCustom,getSceneContext,setEditorLocked};\n${V51_BOOT}`;

function mustReplace(code,from,to,label){if(!code.includes(from))throw new Error(`V5.1 Phase 1.1 patch missing: ${label}`);return code.replace(from,to)}

export default defineConfig({
  base: './',
  plugins: [{
    name: 'hanging-media-v5-1-entry',
    enforce: 'pre',
    transform(code,id) {
      const clean=id.replaceAll('\\','/');
      if (clean.endsWith('/src/main.js')) {
        code=mustReplace(code,CORE_FROM,CORE_TO,'media core exposure');
        code=mustReplace(code,"canvas.addEventListener('pointerdown',e=>{pointerPosition(e);","canvas.addEventListener('pointerdown',e=>{if(window.HMSInteractionRouter?.blocks?.('media'))return;pointerPosition(e);",'media pointerdown guard');
        code=mustReplace(code,"canvas.addEventListener('pointermove',e=>{pointerPosition(e);","canvas.addEventListener('pointermove',e=>{if(window.HMSInteractionRouter?.blocks?.('media'))return;pointerPosition(e);",'media pointermove guard');
        code=mustReplace(code,"canvas.addEventListener('wheel',e=>{e.preventDefault();","canvas.addEventListener('wheel',e=>{if(window.HMSInteractionRouter?.blocks?.('media'))return;e.preventDefault();",'media wheel guard');
        code=mustReplace(code,"function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),elapsed=clock.elapsedTime;target+=state.autoDrift*dt*18;const spring=(target-current)*Math.min(1,dt*(5+state.glide*20));","function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),elapsed=clock.elapsedTime;const editorLocked=window.HMSInteractionRouter?.blocks?.('media');if(editorLocked){target=current;velocity=0}else target+=state.autoDrift*dt*18;const spring=editorLocked?0:(target-current)*Math.min(1,dt*(5+state.glide*20));",'pause media motion during 3D edit');
        code=mustReplace(code,"window.addEventListener('resize',resize);boot().catch(err=>{console.error(err);showLoading(false)});","window.HangingMediaMain={getSceneContext:()=>({scene,camera,renderer,world,canvas,shell}),get cards(){return cards},get current(){return current},get target(){return target},get velocity(){return velocity},get state(){return state}};window.addEventListener('resize',resize);boot().catch(err=>{console.error(err);showLoading(false)});",'main scene exposure');
        return code;
      }
      if (clean.endsWith('/src/v3-studio.js')) return mustReplace(code,V3_API_FROM,V3_API_TO,'V3 layer API');
      if (clean.endsWith('/src/v5-1-character-library.js')) {
        code=mustReplace(code,V51_BOOT,V51_EXTERNAL_API,'V5.1 external API');
        code=mustReplace(code,"stage.addEventListener('pointerdown',e=>{dragging=true;","stage.addEventListener('pointerdown',e=>{if(window.HMSInteractionRouter?.blocks?.('character'))return;dragging=true;",'character pointerdown guard');
        code=mustReplace(code,"stage.addEventListener('pointermove',e=>{if(!dragging)return;","stage.addEventListener('pointermove',e=>{if(window.HMSInteractionRouter?.blocks?.('character'))return;if(!dragging)return;",'character pointermove guard');
        code=mustReplace(code,"stage.addEventListener('wheel',e=>{targetEffort=","stage.addEventListener('wheel',e=>{if(window.HMSInteractionRouter?.blocks?.('character'))return;targetEffort=",'character wheel guard');
        code=mustReplace(code,"function tick(now=performance.now()){if(renderer&&rig){poseRig(now);","function tick(now=performance.now()){if(renderer&&rig){if(window.HMSInteractionRouter?.blocks?.('character'))setEditorLocked(true);poseRig(now);",'pause character narrative during 3D edit');
        code=mustReplace(code,"customRoot=gltf.scene;customRoot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});","customRoot=gltf.scene;let rigNodes=0;customRoot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}if(o.isBone||o.isSkinnedMesh)rigNodes++});if(!rigNodes&&!gltf.animations?.length){customRoot=null;throw new Error('Static 3D assets belong in My 3D Library, not Character Library')} ",'static character rejection');
        return code;
      }
      if (clean.endsWith('/src/v5-1-phase1-hardening.js')) {
        code=mustReplace(code,"transformControls=new TransformControls(c.camera,stage);","transformControls=new TransformControls(c.camera,stage);transformControls.setSize(.62);",'proportional gizmo size');
        code=mustReplace(code,"transformControls.addEventListener('objectChange',syncBackToLibrary);","transformControls.addEventListener('objectChange',()=>updateOutline());",'single transform persistence path');
        code=mustReplace(code,"stage.addEventListener('pointerdown',e=>{if(stage.dataset.gizmoDragging==='true')return;","stage.addEventListener('pointerdown',e=>{if(window.HMSInteractionRouter?.blocks?.('3d'))return;if(stage.dataset.gizmoDragging==='true')return;",'3D pointer guard');
        return code;
      }
      if (clean.endsWith('/src/v5-1-phase1-1-orchestrator.js')) {
        code=mustReplace(code,"function syncMode(){\n  document.body.dataset.editorTool=tool;","function syncMode(){\n  document.body.dataset.editorTool=tool;\n  window.HangingMediaV51Character?.setEditorLocked?.(tool==='3d');",'explicit character editor lock');
        code=mustReplace(code,"function observe(){const mo=new MutationObserver(()=>{enhanceCards();enhanceInstances();cleanLegacyUI();showSelection()});mo.observe($('#authoring-panel')||document.body,{childList:true,subtree:true})}","function observe(){let queued=false;const mo=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhanceCards();enhanceInstances();showSelection()})});mo.observe($('#authoring-panel')||document.body,{childList:true,subtree:true})}",'observer self-trigger guard');
        return code;
      }
      return null;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('</body>', '<script type="module" src="/src/v3-studio.js"></script><script type="module" src="/src/v5-1-character-library.js"></script><script type="module" src="/src/v5-1-logo-fix.js"></script><script type="module" src="/src/v5-1-external-assets.js"></script><script type="module" src="/src/v5-1-asset-library-v2.js"></script><script type="module" src="/src/v5-1-phase1-hardening.js"></script><script type="module" src="/src/v5-1-phase1-readiness.js"></script><script type="module" src="/src/v5-1-phase1-1-orchestrator.js"></script><script type="module" src="/src/v5-1-phase1-1-polish.js"></script></body>');
      }
    }
  }],
  build: {target:'es2022',sourcemap:true}
});
