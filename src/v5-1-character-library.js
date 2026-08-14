import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const KEY='hanging-media-character-v5-1';
const PRESET_KEY='hanging-media-character-v5-1-presets';
const $=(s,r=document)=>r.querySelector(s);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const saved=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}})();
const state={enabled:true,template:'aya',intensity:1,scale:.78,gripX:.19,depth:0,...saved};

const TEMPLATES={
  aya:{name:'AYA · Studio Original',kind:'human',skin:0x6c4032,primary:0xd9534f,secondary:0x223b70,accent:0xe5bd64,hair:0x17151a,shoe:0xf2e9dc,slim:.88,head:.45,upper:.76,lower:.68,leg:1.0,personality:'balanced'},
  noa:{name:'NOA · Editorial Human',kind:'editorial',skin:0xb8755b,primary:0x242329,secondary:0xe9e0d1,accent:0xd6b177,hair:0x251a16,shoe:0x161616,slim:.70,head:.39,upper:.84,lower:.76,leg:1.12,personality:'elegant'},
  mimo:{name:'MIMO · Mascot Creature',kind:'mascot',skin:0xf2a85f,primary:0x6f58b5,secondary:0x2d3158,accent:0xffe4a3,hair:0x5c3c88,shoe:0xf6e7cd,slim:1.10,head:.58,upper:.63,lower:.58,leg:.78,personality:'bouncy'},
  foxie:{name:'FOXIE · Anthro Fox',kind:'fox',skin:0xd87035,primary:0x22494a,secondary:0x50382d,accent:0xffd8a3,hair:0x7a2f1f,shoe:0x30251f,slim:.82,head:.47,upper:.75,lower:.70,leg:.98,personality:'alert'},
  lumi:{name:'LUMI · Fantasy Sprite',kind:'sprite',skin:0xd9c8ff,primary:0x6453a6,secondary:0x94d9cb,accent:0xffe99a,hair:0xdfe8ff,shoe:0x8c78bd,slim:.67,head:.43,upper:.78,lower:.74,leg:.88,personality:'floating'},
  byte:{name:'BYTE · Pop Robot',kind:'robot',skin:0xbfc4ca,primary:0x2a2e38,secondary:0x31d9c5,accent:0xffcf4c,hair:0x191c22,shoe:0x181b20,slim:.80,head:.44,upper:.72,lower:.66,leg:.92,personality:'mechanical'}
};

let renderer,scene,camera,canvas,shell,controls,rig=null,customRoot=null,mixer=null,clipMap=new Map(),activeClip='';
let dragging=false,lastX=0,lastT=0,targetEffort=.035,effort=.035,narrative='idle',wheelUntil=0,releaseAt=0,satisfactionUntil=0,lastFrame=performance.now();

function persist(){localStorage.setItem(KEY,JSON.stringify(state))}
function mat(color,rough=.62,metal=.02,extra={}){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra})}
function mesh(geo,material,parent,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,material);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function capsuleLimb(parent,length,radius,material){const g=new THREE.Group();parent.add(g);mesh(new THREE.CapsuleGeometry(radius,Math.max(.02,length-radius*2),8,16),material,g,[length/2,0,0],[0,0,-Math.PI/2]);return g}
function addEye(parent,x,y,z,iris=0x241d19,scale=1){mesh(new THREE.SphereGeometry(.095*scale,14,10),mat(0xf7f1ea,.34),parent,[x,y,z],[0,0,0],[1,.72,.46]);mesh(new THREE.SphereGeometry(.041*scale,10,8),mat(iris,.3),parent,[x,y-.002,z+.052*scale]);}
function addMouths(parent,skinZ=.48){const lip=mat(0xb95863,.48),neutral=mesh(new THREE.CapsuleGeometry(.017,.18,4,8),lip,parent,[0,-.20,skinZ],[0,0,-Math.PI/2]);const smile=new THREE.Group();parent.add(smile);smile.position.set(0,-.17,skinZ);mesh(new THREE.CapsuleGeometry(.017,.10,4,8),lip,smile,[-.05,0,0],[0,0,-Math.PI/2-.38]);mesh(new THREE.CapsuleGeometry(.017,.10,4,8),lip,smile,[.05,0,0],[0,0,-Math.PI/2+.38]);smile.visible=false;const effortM=mesh(new THREE.TorusGeometry(.065,.014,6,14,Math.PI),lip,parent,[0,-.205,skinZ]);effortM.rotation.z=Math.PI;effortM.visible=false;return{neutral,smile,effort:effortM}}

function buildFace(head,spec){
  if(spec.kind==='robot'){
    const screen=mesh(new THREE.BoxGeometry(.60,.42,.06),mat(0x111722,.28,.2,{emissive:0x06151b,emissiveIntensity:.8}),head,[0,.01,.42]);
    const eyeL=mesh(new THREE.BoxGeometry(.09,.055,.035),mat(spec.secondary,.28,.2,{emissive:spec.secondary,emissiveIntensity:2}),head,[-.16,.07,.47]);
    const eyeR=mesh(new THREE.BoxGeometry(.09,.055,.035),mat(spec.secondary,.28,.2,{emissive:spec.secondary,emissiveIntensity:2}),head,[.16,.07,.47]);
    const mouth=mesh(new THREE.BoxGeometry(.22,.025,.03),mat(spec.accent,.3,.1,{emissive:spec.accent,emissiveIntensity:1.5}),head,[0,-.12,.47]);
    return{kind:'robot',screen,eyeL,eyeR,mouth};
  }
  const sep=spec.kind==='mascot'?.19:.18;addEye(head,-sep,.07,.405,0x2b221f,spec.kind==='mascot'?1.18:1);addEye(head,sep,.07,.405,0x2b221f,spec.kind==='mascot'?1.18:1);
  const dark=mat(spec.hair,.72);const browL=mesh(new THREE.CapsuleGeometry(.022,.15,4,8),dark,head,[-sep,.24,.47],[0,0,-Math.PI/2-.12]);const browR=mesh(new THREE.CapsuleGeometry(.022,.15,4,8),dark,head,[sep,.24,.47],[0,0,-Math.PI/2+.12]);
  return{kind:'organic',browL,browR,...addMouths(head)};
}

function addArchetypeDetails(r,spec,mats){
  const {root,head,torsoPivot,pelvis}=r;
  if(spec.kind==='editorial'){
    mesh(new THREE.BoxGeometry(.80,.10,.50),mats.accent,head,[0,.39,-.02],[0,0,.03]);
    mesh(new THREE.SphereGeometry(.34,18,14),mats.hair,head,[0,.20,-.18],[0,0,0],[1,.95,.55]);
    const coat=mesh(new THREE.BoxGeometry(.72,1.22,.48),mats.primary,torsoPivot,[0,.46,.02]);coat.rotation.z=.015;
  }
  if(spec.kind==='mascot'){
    mesh(new THREE.SphereGeometry(.19,14,10),mats.hair,head,[-.31,.42,-.02],[0,0,0],[.75,1.55,.65]);mesh(new THREE.SphereGeometry(.19,14,10),mats.hair,head,[.31,.42,-.02],[0,0,0],[.75,1.55,.65]);
    mesh(new THREE.TorusGeometry(.54,.055,8,26),mats.accent,torsoPivot,[0,.46,.20],[Math.PI/2,0,0]);
  }
  if(spec.kind==='fox'){
    const earGeo=new THREE.ConeGeometry(.20,.52,4);mesh(earGeo,mats.skin,head,[-.28,.48,-.02],[0,0,-.08]);mesh(earGeo,mats.skin,head,[.28,.48,-.02],[0,0,.08]);
    mesh(new THREE.ConeGeometry(.17,.38,12),mats.accent,head,[0,-.06,.46],[Math.PI/2,0,0]);
    const tail=new THREE.Group();tail.position.set(-.25,.1,-.25);pelvis.add(tail);const t=mesh(new THREE.CapsuleGeometry(.17,1.0,8,14),mats.skin,tail,[-.52,-.38,0],[0,0,-.62],[1,1,.8]);t.rotation.x=.15;
  }
  if(spec.kind==='sprite'){
    const wingMat=mat(0xb8f4e9,.2,0,{transparent:true,opacity:.45,side:THREE.DoubleSide,emissive:0x4d9f96,emissiveIntensity:.25});
    mesh(new THREE.CircleGeometry(.65,24,0,Math.PI),wingMat,torsoPivot,[-.48,.72,-.23],[0,.45,.55],[.62,1.35,1]);mesh(new THREE.CircleGeometry(.65,24,0,Math.PI),wingMat,torsoPivot,[.48,.72,-.23],[0,-.45,-.55],[.62,1.35,1]);
    mesh(new THREE.TorusGeometry(.38,.022,8,28),mats.accent,head,[0,.55,.04],[Math.PI/2,0,0]);
  }
  if(spec.kind==='robot'){
    for(const x of [-.30,.30])mesh(new THREE.BoxGeometry(.15,.15,.15),mats.accent,torsoPivot,[x,.95,.43]);
    mesh(new THREE.CylinderGeometry(.05,.05,.55,10),mats.accent,head,[0,.58,0]);mesh(new THREE.SphereGeometry(.09,12,8),mats.secondary,head,[0,.87,0]);
  }
}

function createRig(spec){
  const root=new THREE.Group();root.name=`V5_1_${spec.kind.toUpperCase()}_ROOT`;
  const mats={skin:mat(spec.skin,.68,spec.kind==='robot'?.55:.02),primary:mat(spec.primary,spec.kind==='robot'?.35:.66,spec.kind==='robot'?.55:.02),secondary:mat(spec.secondary,.58,spec.kind==='robot'?.25:.02),accent:mat(spec.accent,.38,.12),hair:mat(spec.hair,.74),shoe:mat(spec.shoe,.55,spec.kind==='robot'?.35:.02)};
  const pelvis=new THREE.Group();pelvis.position.y=-.12;root.add(pelvis);
  const torsoPivot=new THREE.Group();torsoPivot.position.set(0,.72,0);pelvis.add(torsoPivot);
  const torsoGeo=spec.kind==='robot'?new THREE.BoxGeometry(.86,1.35,.60):new THREE.CapsuleGeometry(.53,1.05,10,20);
  mesh(torsoGeo,mats.primary,torsoPivot,[0,.45,0],[0,0,0],[spec.slim,1,spec.kind==='robot'?.85:.62]);
  const neck=new THREE.Group();neck.position.set(0,1.53,0);torsoPivot.add(neck);mesh(new THREE.CylinderGeometry(.17,.19,.25,14),mats.skin,neck,[0,.07,0]);
  const head=new THREE.Group();head.position.set(0,.46,0);neck.add(head);
  const headGeo=spec.kind==='robot'?new THREE.BoxGeometry(.78,.72,.70):new THREE.SphereGeometry(spec.head,22,16);
  mesh(headGeo,spec.kind==='robot'?mats.primary:mats.skin,head,[0,0,0],[0,0,0],spec.kind==='robot'?[1,1,1]:[.94,1.05,.90]);
  if(spec.kind!=='robot'&&spec.kind!=='sprite')mesh(new THREE.SphereGeometry(spec.head*1.02,20,14),mats.hair,head,[0,.13,-.08],[0,0,0],[1,.88,.73]);
  const face=buildFace(head,spec);
  const shoulderR=new THREE.Group();shoulderR.position.set(.46,1.22,.02);torsoPivot.add(shoulderR);capsuleLimb(shoulderR,spec.upper,.13,mats.primary);const elbowR=new THREE.Group();elbowR.position.x=spec.upper;shoulderR.add(elbowR);capsuleLimb(elbowR,spec.lower,.105,mats.skin);const handR=mesh(new THREE.SphereGeometry(.145,14,10),mats.skin,elbowR,[spec.lower+.035,0,0],[0,0,0],[1.12,.78,.72]);
  const shoulderL=new THREE.Group();shoulderL.position.set(-.46,1.22,-.04);torsoPivot.add(shoulderL);capsuleLimb(shoulderL,spec.upper*.93,.13,mats.primary);const elbowL=new THREE.Group();elbowL.position.x=spec.upper*.93;shoulderL.add(elbowL);capsuleLimb(elbowL,spec.lower*.90,.105,mats.skin);mesh(new THREE.SphereGeometry(.14,14,10),mats.skin,elbowL,[spec.lower*.90+.03,0,0],[0,0,0],[1.08,.77,.70]);
  const hipR=new THREE.Group();hipR.position.set(.25,-.13,0);pelvis.add(hipR);capsuleLimb(hipR,spec.leg,.16,mats.secondary);const kneeR=new THREE.Group();kneeR.position.x=spec.leg;hipR.add(kneeR);capsuleLimb(kneeR,spec.leg*.88,.135,mats.secondary);const footR=new THREE.Group();footR.position.x=spec.leg*.89;kneeR.add(footR);mesh(new THREE.CapsuleGeometry(.15,.27,6,12),mats.shoe,footR,[.08,-.04,.11],[Math.PI/2,0,-Math.PI/2],[1.25,.84,.82]);
  const hipL=new THREE.Group();hipL.position.set(-.25,-.13,-.03);pelvis.add(hipL);capsuleLimb(hipL,spec.leg,.16,mats.secondary);const kneeL=new THREE.Group();kneeL.position.x=spec.leg;hipL.add(kneeL);capsuleLimb(kneeL,spec.leg*.88,.135,mats.secondary);const footL=new THREE.Group();footL.position.x=spec.leg*.89;kneeL.add(footL);mesh(new THREE.CapsuleGeometry(.15,.27,6,12),mats.shoe,footL,[.08,-.04,.11],[Math.PI/2,0,-Math.PI/2],[1.25,.84,.82]);
  hipR.rotation.z=-Math.PI/2-.05;hipL.rotation.z=-Math.PI/2+.07;kneeR.rotation.z=.06;kneeL.rotation.z=-.07;
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.80,28),new THREE.MeshBasicMaterial({color:0x3b2a22,transparent:true,opacity:.15,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-2.10,-.30);root.add(shadow);
  addArchetypeDetails({root,head,torsoPivot,pelvis},spec,mats);
  return{root,spec,pelvis,torsoPivot,neck,head,face,shoulderR,elbowR,handR,shoulderL,elbowL,hipR,kneeR,hipL,kneeL,shadow};
}

function solve2Bone(targetX,targetY,sx,sy,l1,l2){const dx=targetX-sx,dy=targetY-sy,d=clamp(Math.hypot(dx,dy),.08,l1+l2-.02),a=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),base=Math.atan2(dy,dx);return{shoulder:base-a,elbow:Math.acos(clamp((d*d-l1*l1-l2*l2)/(2*l1*l2),-1,1))}}

function ropeScreenTarget(){
  if(!shell)return{x:0,y:2};const r=shell.getBoundingClientRect(),aspect=Math.max(.2,r.width/r.height),fov=THREE.MathUtils.degToRad(34),stageZ=8.8,stageY=.15;
  const sx=clamp(Number(state.gripX||.19),.08,.38),ndcX=sx*2-1,halfW=Math.tan(fov/2)*stageZ*aspect,worldX=ndcX*halfW,ropeWorldY=2.25-.065*worldX*worldX+Math.sin(worldX*.42)*.08+.08,ndcY=(ropeWorldY-stageY)/(Math.tan(fov/2)*stageZ);
  const charHalfH=Math.tan(fov/2)*11.5,charHalfW=charHalfH*camera.aspect;return{x:ndcX*charHalfW,y:ndcY*charHalfH,screenX:sx,worldX,ropeWorldY};
}

function setFacePose(r,q,sat){const hard=q>.42&&narrative!=='satisfaction';if(r.face.kind==='robot'){r.face.eyeL.scale.y=hard?.48:1;r.face.eyeR.scale.y=hard?.48:1;r.face.mouth.scale.x=sat?1.35:hard?.65:1;r.face.mouth.rotation.z=sat?.16:0;return}r.face.neutral.visible=!hard&&!sat;r.face.effort.visible=hard;r.face.smile.visible=Boolean(sat);r.face.browL.rotation.z=hard?.20:sat?-.12:-.12;r.face.browR.rotation.z=hard?-.20:sat?.12:.12;r.face.browL.position.y=hard?.025:0;r.face.browR.position.y=hard?.025:0}

function personalityMotion(r,q,sat,t){const p=r.spec.personality;if(p==='bouncy')r.root.rotation.y=Math.sin(t*.005)*.045*(.2+q);if(p==='elegant')r.head.rotation.y=Math.sin(t*.0015)*.025;if(p==='alert')r.head.rotation.y=.08*Math.sin(t*.003)+q*.05;if(p==='floating')r.root.position.y+=Math.sin(t*.0026)*.08;if(p==='mechanical'){r.torsoPivot.rotation.y=Math.round(Math.sin(t*.003)*2)/2*.018;r.head.rotation.y=Math.sin(t*.004)*.08}}

function poseRig(now){
  if(!rig||!camera)return;const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;const auto=Number($('[data-control="autoDrift"]')?.value||0);
  if(!dragging&&now>wheelUntil){if(now<releaseAt){targetEffort=.13;narrative='release'}else if(now<satisfactionUntil){targetEffort=.045;narrative='satisfaction'}else if(auto>.001){targetEffort=.19+Math.sin(now*.004)*.04;narrative='pull'}else{targetEffort=.032+Math.sin(now*.0016)*.010;narrative='idle'}}
  effort+=(targetEffort-effort)*.115;const q=clamp(effort*Number(state.intensity||1),0,1.2),sat=narrative==='satisfaction'?1:0,breath=Math.sin(now*.0021)*.014,grip=ropeScreenTarget(),s=Number(state.scale||.78);
  const shoulderBase=1.82,rootY=grip.y-(shoulderBase+.34)*s,rootX=grip.x-(1.05+q*.11)*s;
  rig.root.scale.setScalar(s);rig.root.position.set(rootX,rootY+breath,Number(state.depth||0));rig.root.rotation.y=-.04;
  rig.pelvis.rotation.z=-.035-q*.075;rig.pelvis.position.x=-q*.045;rig.pelvis.position.y=-.12-q*.04+sat*.025;
  rig.torsoPivot.rotation.z=-.025-q*.15+sat*.02;rig.torsoPivot.position.y=.72-q*.018+sat*.025;rig.neck.rotation.z=q*.06-sat*.03;rig.head.rotation.z=-q*.075+sat*.04;rig.head.rotation.x=-q*.02-sat*.025;
  rig.hipR.rotation.z=-Math.PI/2-q*.08;rig.hipL.rotation.z=-Math.PI/2+q*.10;rig.kneeR.rotation.z=.07+q*.13;rig.kneeL.rotation.z=-.07-q*.09;rig.shoulderL.rotation.z=Math.PI*.70+.18+q*.26;rig.elbowL.rotation.z=-.50-q*.20;
  rig.root.updateMatrixWorld(true);const targetWorld=new THREE.Vector3(grip.x,grip.y,Number(state.depth||0)+.02),targetLocal=rig.torsoPivot.worldToLocal(targetWorld.clone()),sol=solve2Bone(targetLocal.x,targetLocal.y,rig.shoulderR.position.x,rig.shoulderR.position.y,rig.spec.upper,rig.spec.lower+.035);rig.shoulderR.rotation.z=sol.shoulder;rig.elbowR.rotation.z=sol.elbow;
  setFacePose(rig,q,sat);personalityMotion(rig,q,sat,now);rig.shadow.material.opacity=.12+q*.07;rig.shadow.scale.set(1+q*.08,1-q*.05,1);
  canvas.dataset.state=narrative;canvas.dataset.effort=q.toFixed(3);canvas.dataset.template=state.template;canvas.dataset.ropeTarget=`${grip.screenX.toFixed(3)},${grip.ropeWorldY.toFixed(3)}`;canvas.dataset.gripAligned='true';
  if(customRoot){customRoot.visible=state.enabled&&state.template==='custom';customRoot.position.set(rootX,rootY-2.0,Number(state.depth||0));customRoot.rotation.z=-q*.06+sat*.02;if(mixer){playClip(narrative==='effort'?'effort':narrative);mixer.update(dt)}}
}

function setTemplate(id){if(!TEMPLATES[id])return;state.template=id;persist();if(rig){scene.remove(rig.root);rig=null}rig=createRig(TEMPLATES[id]);scene.add(rig.root);syncTemplateSelect()}
function syncTemplateSelect(){const el=$('#v5-1-template');if(el)el.value=state.template;const chip=$('#v5-1-template-chip');if(chip)chip.textContent=TEMPLATES[state.template]?.name||'CUSTOM GLB'}
function syncVisibility(){if(canvas)canvas.style.display=state.enabled?'block':'none';if(rig?.root)rig.root.visible=state.enabled&&state.template!=='custom';if(customRoot)customRoot.visible=state.enabled&&state.template==='custom'}

function savePreset(){const arr=(()=>{try{return JSON.parse(localStorage.getItem(PRESET_KEY)||'[]')}catch{return[]}})();arr.unshift({id:`preset-${Date.now()}`,name:`${TEMPLATES[state.template]?.name||'Custom'} · ${new Date().toLocaleTimeString()}`,settings:{...state}});localStorage.setItem(PRESET_KEY,JSON.stringify(arr.slice(0,12)));renderPresetCount();toast('Character preset saved ✓')}
function renderPresetCount(){const arr=(()=>{try{return JSON.parse(localStorage.getItem(PRESET_KEY)||'[]')}catch{return[]}})();const el=$('#v5-1-preset-count');if(el)el.textContent=`${arr.length} saved preset${arr.length===1?'':'s'}`}
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1400)}

function mountCharacterUI(){const panel=$('#authoring-panel');if(!panel)return;$('#v5-character-controls')?.remove();const sec=document.createElement('section');sec.id='v5-1-character-controls';sec.className='control-section accent-section';sec.innerHTML=`<div class="section-title-row"><h2>Character Library</h2><span class="selected-chip">V5.1 · 6 TEMPLATES</span></div>
<label class="toggle-row"><span>Character</span><input id="v5-1-enabled" type="checkbox" ${state.enabled?'checked':''}/></label>
<label>Template <select id="v5-1-template">${Object.entries(TEMPLATES).map(([id,t])=>`<option value="${id}">${t.name}</option>`).join('')}<option value="custom">Custom rigged GLB</option></select></label>
<div id="v5-1-template-chip" class="asset-status"></div>
<label>Motion intensity <output id="v5-1-intensity-out">${Number(state.intensity).toFixed(2)}</output><input id="v5-1-intensity" type="range" min="0.35" max="1.8" step="0.05" value="${state.intensity}"/></label>
<label>Character scale <output id="v5-1-scale-out">${Number(state.scale).toFixed(2)}</output><input id="v5-1-scale" type="range" min="0.5" max="1.2" step="0.01" value="${state.scale}"/></label>
<label>Rope grip point <output id="v5-1-grip-out">${Number(state.gripX).toFixed(2)}</output><input id="v5-1-grip" type="range" min="0.08" max="0.38" step="0.01" value="${state.gripX}"/></label>
<label>Depth <output id="v5-1-depth-out">${Number(state.depth).toFixed(2)}</output><input id="v5-1-depth" type="range" min="-1" max="1" step="0.05" value="${state.depth}"/></label>
<div class="button-row"><button id="v5-1-save-preset" class="secondary-button" type="button">Save character preset</button><label class="upload-button" for="v5-1-glb">+ Custom GLB</label></div><input id="v5-1-glb" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" hidden/>
<div id="v5-1-preset-count" class="asset-status"></div><div id="v5-1-glb-status" class="asset-status">Built-in templates use live procedural rigs. Custom GLB remains available as advanced intake.</div>`;
  panel.insertBefore(sec,panel.children[1]||panel.firstChild);controls=sec;
  $('#v5-1-enabled').onchange=e=>{state.enabled=e.target.checked;persist();syncVisibility()};$('#v5-1-template').onchange=e=>{if(e.target.value==='custom'){state.template='custom';persist();syncVisibility();syncTemplateSelect()}else setTemplate(e.target.value)};
  $('#v5-1-intensity').oninput=e=>{state.intensity=Number(e.target.value);$('#v5-1-intensity-out').textContent=state.intensity.toFixed(2);persist()};$('#v5-1-scale').oninput=e=>{state.scale=Number(e.target.value);$('#v5-1-scale-out').textContent=state.scale.toFixed(2);persist()};$('#v5-1-grip').oninput=e=>{state.gripX=Number(e.target.value);$('#v5-1-grip-out').textContent=state.gripX.toFixed(2);persist()};$('#v5-1-depth').oninput=e=>{state.depth=Number(e.target.value);$('#v5-1-depth-out').textContent=state.depth.toFixed(2);persist()};$('#v5-1-save-preset').onclick=savePreset;$('#v5-1-glb').onchange=e=>{const f=e.target.files?.[0];if(f)loadCustom(f)};renderPresetCount();syncTemplateSelect();
}

function mountBrandingShortcut(){const panel=$('#authoring-panel');if(!panel||$('#v5-1-branding'))return;const sec=document.createElement('section');sec.id='v5-1-branding';sec.className='control-section accent-section';const positions=['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'];sec.innerHTML=`<div class="section-title-row"><h2>Text & Logo</h2><span class="selected-chip">BRANDING</span></div><label>Apply to <select id="v5-1-brand-scope"><option value="global">Global / scene</option><option value="item">Selected piece</option></select></label><label>Position <select id="v5-1-brand-position">${positions.map(p=>`<option value="${p}">${p.replace('-',' ')}</option>`).join('')}</select></label><label>Text <input id="v5-1-brand-text" class="v3-input" placeholder="Name / title / claim / CTA"/></label><div class="button-row"><button id="v5-1-add-text" class="secondary-button" type="button">+ Add text</button><label class="upload-button" for="v5-1-logo">+ Upload logo</label></div><input id="v5-1-logo" type="file" accept="image/*,.svg" hidden/><label>Text / logo size <input id="v5-1-brand-size" type="range" min="10" max="100" step="1" value="28"/></label><label>Color <input id="v5-1-brand-color" type="color" value="#ffffff"/></label><label>Opacity <input id="v5-1-brand-opacity" type="range" min="0.1" max="1" step="0.05" value="1"/></label><div class="button-row"><button id="v5-1-clear-brand" class="secondary-button" type="button">Clear layers</button><button id="v5-1-open-project" class="secondary-button" type="button">Project / Output ↓</button></div><div class="asset-status">These controls reuse the V3 project layer engine, so text and logos are saved with the project and included in PNG / WebM / Final HTML.</div>`;panel.insertBefore(sec,controls?.nextSibling||panel.children[2]||null);
  const sync=()=>{if($('#v3-layer-scope'))$('#v3-layer-scope').value=$('#v5-1-brand-scope').value;if($('#v3-layer-position'))$('#v3-layer-position').value=$('#v5-1-brand-position').value;if($('#v3-layer-size'))$('#v3-layer-size').value=$('#v5-1-brand-size').value;if($('#v3-layer-color'))$('#v3-layer-color').value=$('#v5-1-brand-color').value;if($('#v3-layer-opacity'))$('#v3-layer-opacity').value=$('#v5-1-brand-opacity').value};
  $('#v5-1-add-text').onclick=()=>{sync();const t=$('#v5-1-brand-text').value.trim();if(!t)return;if($('#v3-text'))$('#v3-text').value=t;$('#v3-add-text')?.click();$('#v5-1-brand-text').value='';toast('Text added ✓')};
  $('#v5-1-logo').onchange=e=>{const f=e.target.files?.[0];if(!f)return;sync();const target=$('#v3-logo');if(target){const dt=new DataTransfer();dt.items.add(f);target.files=dt.files;target.dispatchEvent(new Event('change',{bubbles:true}))}e.target.value='';toast('Logo added ✓')};
  $('#v5-1-clear-brand').onclick=()=>$('#v3-clear-layers')?.click();$('#v5-1-open-project').onclick=()=>$('#v3-studio')?.scrollIntoView({behavior:'smooth',block:'start'});
  const brand=$('#v3-branding-overlay');if(brand)brand.style.zIndex='14';
}

function findClip(name){for(const [n,c] of clipMap){if(n===name||n.includes(name))return c}return clipMap.get('idle')||[...clipMap.values()][0]}
function playClip(name){if(!mixer)return;const c=findClip(name);if(!c||c.name===activeClip)return;const next=mixer.clipAction(c);next.reset().fadeIn(.16).play();for(const a of mixer._actions||[])if(a!==next)a.fadeOut(.16);activeClip=c.name}
async function loadCustom(file){const status=$('#v5-1-glb-status');status.textContent=`Loading ${file.name}…`;try{const url=URL.createObjectURL(file),gltf=await new GLTFLoader().loadAsync(url);URL.revokeObjectURL(url);if(customRoot)scene.remove(customRoot);if(mixer)mixer.stopAllAction();clipMap.clear();activeClip='';customRoot=gltf.scene;customRoot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});const box=new THREE.Box3().setFromObject(customRoot),size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);const ss=4/Math.max(size.y,.001);customRoot.scale.setScalar(ss);customRoot.position.set(-center.x*ss,-box.min.y*ss-2,-center.z*ss);scene.add(customRoot);if(gltf.animations?.length){mixer=new THREE.AnimationMixer(customRoot);for(const c of gltf.animations)clipMap.set(c.name.toLowerCase(),c);playClip('idle')}state.template='custom';persist();syncTemplateSelect();syncVisibility();status.textContent=`${file.name} · ${gltf.animations?.length||0} clip(s) · ${gltf.animations?.length?'animation-ready':'static preview only'}`}catch(err){console.error(err);status.textContent=`Could not load ${file.name}`}}

function bindMotion(){const stage=$('#stage');if(!stage)return;stage.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastT=performance.now();targetEffort=.22;releaseAt=0;satisfactionUntil=0;narrative='reach';setTimeout(()=>{if(dragging&&narrative==='reach')narrative='grab'},90)});stage.addEventListener('pointermove',e=>{if(!dragging)return;const now=performance.now(),dt=Math.max(16,now-lastT),dx=e.clientX-lastX;lastX=e.clientX;lastT=now;targetEffort=clamp(.34+Math.abs(dx)/dt*4,.34,1);narrative=targetEffort>.58?'effort':'pull'});const up=()=>{if(!dragging)return;dragging=false;targetEffort=.12;releaseAt=performance.now()+260;satisfactionUntil=performance.now()+1450;narrative='release'};stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);stage.addEventListener('wheel',e=>{targetEffort=clamp(.32+Math.abs(e.deltaY)*.004,.32,1);wheelUntil=performance.now()+300;narrative='pull'},{passive:true})}

function initScene(){shell=$('#stage-shell');if(!shell)return setTimeout(initScene,70);$('#v5-character-canvas')?.style.setProperty('display','none','important');$('#v5-character-controls')?.style.setProperty('display','none','important');$('#v4-character-layer')?.style.setProperty('display','none','important');canvas=document.createElement('canvas');canvas.id='v5-1-character-canvas';canvas.setAttribute('aria-label','V5.1 six-template 3D character library');Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'11'});shell.appendChild(canvas);renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(0,0,11.5);scene.add(new THREE.HemisphereLight(0xfff3df,0x40352f,1.7));const key=new THREE.DirectionalLight(0xffd8b2,3.1);key.position.set(-3,6,7);key.castShadow=true;scene.add(key);const rim=new THREE.DirectionalLight(0xa9cfff,1.0);rim.position.set(5,3,-5);scene.add(rim);rig=createRig(TEMPLATES[state.template]||TEMPLATES.aya);scene.add(rig.root);const resize=()=>{const r=shell.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()};resize();new ResizeObserver(resize).observe(shell);mountCharacterUI();setTimeout(mountBrandingShortcut,80);bindMotion();syncVisibility();document.title='Hanging Media Studio V5.1 — Character Template Library';if($('.panel-header h1'))$('.panel-header h1').textContent='Hanging Media Studio V5.1';if($('.panel-header .eyebrow'))$('.panel-header .eyebrow').textContent='LIVE COMPONENT / V5.1';if($('.stage-badge'))$('.stage-badge').textContent='HANGING MEDIA / V5.1 CHARACTER LIBRARY';requestAnimationFrame(tick)}
function tick(now=performance.now()){if(renderer&&rig){poseRig(now);rig.root.visible=state.enabled&&state.template!=='custom';renderer.render(scene,camera)}requestAnimationFrame(tick)}
function boot(){if(!$('#stage')||!$('#authoring-panel'))return setTimeout(boot,60);initScene()}
boot();
