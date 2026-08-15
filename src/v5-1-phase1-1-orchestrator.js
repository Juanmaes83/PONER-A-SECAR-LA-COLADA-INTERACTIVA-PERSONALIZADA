import * as THREE from 'three';

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const THUMB_KEY='hms-v5-1-asset-thumbnails';
const safeParse=(v,f={})=>{try{return v?JSON.parse(v):f}catch{return f}};
let tool='experience',snap=15,advanced=false,selectedId=null,saveTimer=null;

const Router={
  get tool(){return tool},
  owner:'experience',
  blocks(kind){
    if(tool==='3d') return kind==='media'||kind==='character';
    return kind==='3d';
  },
  setTool(next){tool=next==='3d'?'3d':'experience';this.owner=tool;syncMode();}
};
window.HMSInteractionRouter=Router;

function sceneContext(){return window.HangingMediaV51Character?.getSceneContext?.()||null;}
function instances(){return window.HangingMediaV51AssetLibrary?.getInstances?.()||[];}
function rootFor(id){const c=sceneContext();if(!c||!id)return null;let found=null;c.scene.traverse(o=>{if(!found&&o.userData?.v51InstanceId===id)found=o});while(found?.parent&&found.parent.userData?.v51InstanceId===id)found=found.parent;return found}
function selected(){selectedId=window.__V51_PHASE1__?.selectedId||selectedId||instances()[0]?.id||null;return selectedId}
function helpers(){const c=sceneContext();if(!c)return[];return c.scene.children.filter(o=>o.userData?.v51System)}
function setHelpersVisible(v){helpers().forEach(o=>o.visible=v)}

function syncMode(){
  document.body.dataset.editorTool=tool;
  const exp=$('#v511-experience'),edit=$('#v511-edit3d'),status=$('#v511-mode-status');
  exp?.classList.toggle('active',tool==='experience');edit?.classList.toggle('active',tool==='3d');
  if(status)status.textContent=tool==='3d'?'EDIT 3D · Hanging Media and character stay visible but their gestures are locked.':'PREVIEW EXPERIENCE · rope, fabric and character gestures active.';
  setHelpersVisible(tool==='3d');
  const t=$('#v51-gizmo-toolbar');if(t)t.style.display=tool==='3d'?'grid':'none';
  const s=$('#v51-gizmo-status');if(s)s.style.display=tool==='3d'?'block':'none';
}

function installModeBar(){
  const panel=$('#authoring-panel');if(!panel||$('#v511-modebar'))return;
  const bar=document.createElement('section');bar.id='v511-modebar';bar.className='control-section v511-modebar';
  bar.innerHTML=`<div class="section-title-row"><h2>Experience / Editor</h2><span class="selected-chip">PHASE 1.1</span></div><div class="button-row"><button id="v511-experience" class="secondary-button active">Preview experience</button><button id="v511-edit3d" class="secondary-button">Edit 3D objects</button></div><div id="v511-mode-status" class="asset-status"></div><div class="v511-editor-options"><label>Rotation snap <select id="v511-snap"><option value="1">1°</option><option value="5">5°</option><option value="15" selected>15°</option></select></label><button id="v511-focus" class="secondary-button">Focus selected</button><button id="v511-advanced" class="secondary-button">Advanced XYZ</button></div>`;
  panel.insertBefore(bar,panel.firstElementChild?.nextSibling||panel.firstChild);
  $('#v511-experience').onclick=()=>Router.setTool('experience');
  $('#v511-edit3d').onclick=()=>Router.setTool('3d');
  $('#v511-snap').onchange=e=>snap=Number(e.target.value)||1;
  $('#v511-focus').onclick=bringIntoView;
  $('#v511-advanced').onclick=()=>{advanced=!advanced;document.body.classList.toggle('v511-advanced',advanced);$('#v511-advanced').textContent=advanced?'Hide advanced XYZ':'Advanced XYZ'};
  syncMode();
}

function installLayerContract(){
  const style=document.createElement('style');style.id='v511-style';style.textContent=`
  #stage{position:relative;z-index:5}.v3-branding-overlay,#v3-branding-overlay{z-index:20!important}.v511-modebar{border:1px solid rgba(102,217,200,.22)!important}.v511-editor-options{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;align-items:end;margin-top:8px}.v511-modebar button.active{border-color:#66d9c8!important;background:rgba(102,217,200,.11)!important}.v51lib-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.v51lib-card{position:relative}.v51lib-card img{aspect-ratio:4/3!important;max-height:92px!important}.v51lib-card>div{padding:7px!important;gap:4px!important}.v51lib-card .danger-button{display:none!important}.v51lib-card button[data-act="add"]{font-size:10px!important;padding:6px!important}.v511-menu{position:absolute;right:6px;top:6px;width:28px!important;height:28px;border-radius:50%!important;padding:0!important;z-index:2}.v511-menu-panel{display:none;position:absolute;right:6px;top:36px;z-index:4;background:#111722;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:6px}.v51lib-card.menu-open .v511-menu-panel{display:block}.v511-menu-panel button{font-size:10px}.v511-instance-note{font-size:9px;opacity:.65;margin:4px 0 8px}.v511-quick-note{font-size:9px;opacity:.72;margin-top:6px}#v51lib-transform .v51lib-tgrid,#v51lib-transform>label:not(.toggle-row){display:none!important}.v511-advanced #v51lib-transform .v51lib-tgrid,.v511-advanced #v51lib-transform>label:not(.toggle-row){display:grid!important}#v3-studio,#v5-character-controls,#v4-character-controls{display:none!important}body[data-editor-tool="experience"] #v51lib-transform{opacity:.62!important}body[data-editor-tool="experience"] #v51lib-transform input,body[data-editor-tool="experience"] #v51lib-transform button{pointer-events:none}.v51lib-inst{position:relative;padding-right:58px!important}.v511-focus-row{position:absolute;right:5px;top:4px;font-size:9px;padding:4px 6px;border:1px solid rgba(255,255,255,.12);border-radius:7px}.v511-selection-label{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:31;background:rgba(12,16,22,.84);color:white;border:1px solid rgba(102,217,200,.5);padding:5px 9px;border-radius:999px;font:500 10px Inter,Arial;pointer-events:none;display:none}body[data-editor-tool="3d"] .v511-selection-label.show{display:block}@media(max-width:900px){.v511-editor-options{grid-template-columns:1fr}.v51lib-grid{grid-template-columns:1fr!important}}
  `;document.head.appendChild(style);
  let label=$('#v511-selection-label');if(!label){label=document.createElement('div');label.id='v511-selection-label';label.className='v511-selection-label';$('#stage-shell')?.appendChild(label)}
}

function cleanLegacyUI(){
  $('#v3-studio')?.setAttribute('aria-hidden','true');
  const sec=$('#v5-1-asset-library-v2');if(sec){sec.querySelector('h2').textContent='My 3D Library';const h3=sec.querySelector('.section-title-row h3');if(h3)h3.textContent='Objects in this Scene';const intro=sec.querySelector('.asset-status');if(intro)intro.textContent='Saved 3D models. Add one or more instances without replacing Hanging Media.';if(!sec.querySelector('.v511-instance-note')){const note=document.createElement('div');note.className='v511-instance-note';note.textContent='LIBRARY = saved models · SCENE = objects currently placed in this experience.';$('#v51lib-instances')?.insertAdjacentElement('beforebegin',note)}if(!sec.querySelector('.v511-quick-note')){const q=document.createElement('div');q.className='v511-quick-note';q.textContent='Quick mode: select an object in the canvas, then Move / Rotate / Scale. Use Advanced XYZ only when precision is needed.';$('#v51lib-transform')?.prepend(q)}}
}

function enhanceCards(){
  const thumbs=safeParse(localStorage.getItem(THUMB_KEY),{});
  $$('.v51lib-card').forEach(card=>{
    const id=card.dataset.a,img=card.querySelector('img');if(thumbs[id]&&img)img.src=thumbs[id];
    if(!card.querySelector('.v511-menu')){const menu=document.createElement('button');menu.type='button';menu.className='secondary-button v511-menu';menu.textContent='⋯';menu.onclick=e=>{e.stopPropagation();card.classList.toggle('menu-open')};const p=document.createElement('div');p.className='v511-menu-panel';p.innerHTML='<button type="button" class="danger-button">Delete saved asset</button>';p.querySelector('button').onclick=async e=>{e.stopPropagation();if(!confirm('Delete this saved 3D asset? Scene instances must be removed first.'))return;await window.HangingMediaV51AssetLibrary?.deleteAsset?.(id);card.remove()};card.append(menu,p)}
  })
}

function enhanceInstances(){
  $$('.v51lib-inst').forEach(row=>{if(row.querySelector('.v511-focus-row'))return;const f=document.createElement('span');f.className='v511-focus-row';f.textContent='Focus';f.onclick=e=>{e.preventDefault();e.stopPropagation();row.click();setTimeout(bringIntoView,0)};row.appendChild(f)});
}

function autoPlacement(){const n=instances().length;return{x:-2.4+(n%4)*1.6,y:-1.45+Math.floor(n/4)*.15,z:.35+Math.floor(n/4)*.08}}
function interceptLibraryActions(){const grid=$('#v51lib-grid');if(!grid||grid.dataset.v511)return;grid.dataset.v511='1';grid.addEventListener('click',async e=>{const btn=e.target.closest('[data-act="add"]');if(!btn)return;const card=btn.closest('[data-a]');if(!card)return;e.preventDefault();e.stopImmediatePropagation();Router.setTool('3d');const rec=await window.HangingMediaV51AssetLibrary.addInstance(card.dataset.a,{position:autoPlacement()});selectedId=rec?.id||null;await sleep(80);window.__V51_PHASE1__?.matchRoots?.();await generateThumbnail(card.dataset.a,selectedId);enhanceCards();enhanceInstances();showSelection();},{capture:true})}

function capture3DOwnership(){const stage=$('#stage');if(!stage||stage.dataset.v511capture)return;stage.dataset.v511capture='1';stage.addEventListener('pointerdown',e=>{if(tool!=='3d')return;Router.owner='3d';selectedId=window.__V51_PHASE1__?.selectedId||selectedId;},{capture:true});stage.addEventListener('wheel',()=>{if(tool==='3d')Router.owner='3d'},{capture:true,passive:true});}

function showSelection(){selectedId=selected();const label=$('#v511-selection-label'),r=instances().find(x=>x.id===selectedId);if(label){label.textContent=r?`3D · ${r.name}`:'';label.classList.toggle('show',Boolean(r))}setHelpersVisible(tool==='3d')}

function clampAndSnap(){const r=instances().find(x=>x.id===selected());const root=rootFor(r?.id);if(!r||!root)return;root.position.x=THREE.MathUtils.clamp(root.position.x,-4.6,4.6);root.position.y=THREE.MathUtils.clamp(root.position.y,-2.7,3.2);root.position.z=THREE.MathUtils.clamp(root.position.z,-.8,2.2);if(snap>1){for(const a of ['x','y','z'])root.rotation[a]=THREE.MathUtils.degToRad(Math.round(THREE.MathUtils.radToDeg(root.rotation[a])/snap)*snap)}root.scale.setScalar(THREE.MathUtils.clamp(root.scale.x,.08,3));commitRoot(root,r.id)}
function commitRoot(root,id){const fields={px:root.position.x,py:root.position.y,pz:root.position.z,rx:THREE.MathUtils.radToDeg(root.rotation.x),ry:THREE.MathUtils.radToDeg(root.rotation.y),rz:THREE.MathUtils.radToDeg(root.rotation.z),scale:root.scale.x};for(const [k,v] of Object.entries(fields)){const el=$(`#v51lib-${k}`);if(el){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))}}selectedId=id;showSelection()}
function installCommitBoundary(){const stage=$('#stage');if(!stage||stage.dataset.v511commit)return;stage.dataset.v511commit='1';stage.addEventListener('pointerup',()=>{if(tool!=='3d')return;clearTimeout(saveTimer);saveTimer=setTimeout(clampAndSnap,0)},true);stage.addEventListener('pointercancel',()=>{if(tool==='3d')setTimeout(clampAndSnap,0)},true);}

function bringIntoView(){const id=selected(),root=rootFor(id);if(!root)return;root.position.x=0;root.position.y=-1.35;root.position.z=.45;commitRoot(root,id);window.__V51_PHASE1__?.attach?.(id)}

async function generateThumbnail(assetId,instanceId){const root=rootFor(instanceId);if(!root)return;try{const clone=root.clone(true),box=new THREE.Box3().setFromObject(clone),size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);clone.position.sub(center);const scene=new THREE.Scene();scene.background=new THREE.Color(0x151b24);scene.add(clone,new THREE.HemisphereLight(0xffffff,0x334455,2));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(4,5,6);scene.add(key);const camera=new THREE.PerspectiveCamera(35,4/3,.01,100),max=Math.max(size.x,size.y,size.z,.01);camera.position.set(max*1.6,max*.8,max*2.6);camera.lookAt(0,0,0);const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setSize(320,240,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/webp',.78);renderer.dispose();const map=safeParse(localStorage.getItem(THUMB_KEY),{});map[assetId]=url;localStorage.setItem(THUMB_KEY,JSON.stringify(map));const card=$(`.v51lib-card[data-a="${assetId}"] img`);if(card)card.src=url}catch(e){console.warn('3D thumbnail generation failed',e)}}

function centralState(){return{tool,mediaCount:window.HangingMediaCore?.mediaRuntime?.items?.length||0,background:Boolean(window.HangingMediaCore?.sceneAssets?.background),branding:window.HangingMediaV3?.getProject?.()?.layers||[],character:document.querySelector('#v5-1-character-canvas')?.dataset?.template||'unknown',assets3d:window.HangingMediaV51AssetLibrary?.getAssets?.().map(a=>({id:a.id,name:a.name,category:a.category,meta:a.meta}))||[],instances3d:instances().map(r=>({id:r.id,assetId:r.assetId,name:r.name,position:{...r.position},rotation:{...r.rotation},scale:r.scale,visible:r.visible!==false}))}}
window.HangingMediaV51SceneState={snapshot:centralState,get tool(){return tool}};

function observe(){const mo=new MutationObserver(()=>{enhanceCards();enhanceInstances();cleanLegacyUI();showSelection()});mo.observe($('#authoring-panel')||document.body,{childList:true,subtree:true})}

async function boot(){let n=0;while((!window.__V51_PHASE1__?.ready||!window.__V51_ASSET_LIBRARY__?.ready||!sceneContext()||!$('#v51lib-grid'))&&n++<180)await sleep(50);installLayerContract();installModeBar();cleanLegacyUI();enhanceCards();enhanceInstances();interceptLibraryActions();capture3DOwnership();installCommitBoundary();observe();syncMode();window.__V51_PHASE1_1__={ready:true,Router,rootFor,bringIntoView,clampAndSnap,snapshot:centralState};window.dispatchEvent(new CustomEvent('hms:phase1-1-ready'));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
