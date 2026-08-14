import * as THREE from 'three';

const KEY='hanging-media-character-v5';
const state={enabled:true,mode:'3d',intensity:1,scale:1,gripHeight:.735,depth:0,...(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}})()};
const $=(s,r=document)=>r.querySelector(s);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
let dragging=false,lastX=0,lastT=0,targetEffort=.04,effort=.04,releaseAt=0,satisfactionUntil=0,wheelUntil=0,direction=1;
let renderer,scene,camera,rig,overlay,controls,resizeObserver;

function persist(){localStorage.setItem(KEY,JSON.stringify(state))}
function mat(color,rough=.62,metal=.02){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function mesh(geo,material,parent,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,material);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function limb(parent,length,radius,material){const g=new THREE.Group();parent.add(g);mesh(new THREE.CapsuleGeometry(radius,Math.max(.02,length-radius*2),8,16),material,g,[length/2,0,0],[0,0,-Math.PI/2]);return g}
function shoe(parent,material){return mesh(new THREE.CapsuleGeometry(.16,.28,6,12),material,parent,[.08,-.05,.12],[Math.PI/2,0,-Math.PI/2],[1.25,.85,.8])}

function createFace(head,skin){
  const dark=mat(0x18161a,.72),white=mat(0xf5efe8,.38),iris=mat(0x30231f,.35),gold=mat(0xf0c66c,.45,.08),lip=mat(0xbd5d62,.48);
  const eyeGeo=new THREE.SphereGeometry(.105,16,12);
  for(const x of [-.19,.19]){mesh(eyeGeo,white,head,[x,.08,.405],[0,0,0],[1,.72,.45]);mesh(new THREE.SphereGeometry(.045,12,10),iris,head,[x,.075,.458]);mesh(new THREE.SphereGeometry(.013,8,6),white,head,[x+.014,.098,.49]);}
  const browL=mesh(new THREE.CapsuleGeometry(.025,.16,4,8),dark,head,[-.19,.26,.47],[0,0,-Math.PI/2-.12]);
  const browR=mesh(new THREE.CapsuleGeometry(.025,.16,4,8),dark,head,[.19,.26,.47],[0,0,-Math.PI/2+.12]);
  const mouthNeutral=mesh(new THREE.CapsuleGeometry(.018,.20,4,8),lip,head,[0,-.22,.475],[0,0,-Math.PI/2]);
  const mouthSmile=new THREE.Group();head.add(mouthSmile);mouthSmile.position.set(0,-.19,.475);const left=mesh(new THREE.CapsuleGeometry(.018,.11,4,8),lip,mouthSmile,[-.055,0,0],[0,0,-Math.PI/2-.34]);const right=mesh(new THREE.CapsuleGeometry(.018,.11,4,8),lip,mouthSmile,[.055,0,0],[0,0,-Math.PI/2+.34]);mouthSmile.visible=false;
  const mouthEffort=mesh(new THREE.TorusGeometry(.07,.015,6,16,Math.PI),lip,head,[0,-.21,.47],[0,0,0]);mouthEffort.rotation.z=Math.PI;mouthEffort.visible=false;
  // headband and hair buns
  mesh(new THREE.TorusGeometry(.43,.035,8,28,Math.PI),gold,head,[0,.25,.05],[Math.PI/2,0,0]);
  mesh(new THREE.SphereGeometry(.22,18,14),dark,head,[-.34,.48,.02],[0,0,0],[1.05,1.2,.8]);
  mesh(new THREE.SphereGeometry(.22,18,14),dark,head,[.34,.48,.02],[0,0,0],[1.05,1.2,.8]);
  return {browL,browR,mouthNeutral,mouthSmile,mouthEffort};
}

function createCharacter(){
  const root=new THREE.Group();root.name='AYA_3D_ROOT';
  const skin=mat(0x6c4032,.7),coat=mat(0xd9534f,.68),coatDark=mat(0x983943,.72),pants=mat(0x223b70,.76),shoeMat=mat(0xf2e9dc,.56),hair=mat(0x17151a,.76),gold=mat(0xe5bd64,.4,.15);
  const pelvis=new THREE.Group();pelvis.position.y=-.15;root.add(pelvis);
  const torsoPivot=new THREE.Group();torsoPivot.position.set(0,.75,0);pelvis.add(torsoPivot);
  const torso=mesh(new THREE.CapsuleGeometry(.55,1.08,10,20),coat,torsoPivot,[0,.45,0],[0,0,0],[.88,1,.62]);
  mesh(new THREE.CapsuleGeometry(.035,.72,5,10),coatDark,torsoPivot,[0,.47,.49],[0,0,0],[1,1,.6]);
  for(const y of [.2,.5,.8])mesh(new THREE.SphereGeometry(.05,10,8),gold,torsoPivot,[.02,y,.51]);
  const neck=new THREE.Group();neck.position.set(0,1.55,0);torsoPivot.add(neck);mesh(new THREE.CylinderGeometry(.18,.2,.28,16),skin,neck,[0,.08,0]);
  const head=new THREE.Group();head.position.set(0,.48,0);neck.add(head);mesh(new THREE.SphereGeometry(.45,24,18),skin,head,[0,0,0],[0,0,0],[.92,1.05,.9]);mesh(new THREE.SphereGeometry(.465,22,16),hair,head,[0,.15,-.06],[0,0,0],[1,1,.82]);
  // front facial skin plate hides front hair shell
  mesh(new THREE.SphereGeometry(.432,24,18,0,Math.PI*2,0,Math.PI*.70),skin,head,[0,-.01,.055],[0,0,0],[.92,1.02,.9]);
  const face=createFace(head,skin);
  // scarf
  mesh(new THREE.TorusGeometry(.34,.055,8,24),mat(0xead6a3,.72),neck,[0,.0,.04],[Math.PI/2,0,0]);

  const shoulderR=new THREE.Group();shoulderR.position.set(.48,1.24,.02);torsoPivot.add(shoulderR);
  const upperR=limb(shoulderR,.76,.13,coat);const elbowR=new THREE.Group();elbowR.position.x=.76;shoulderR.add(elbowR);const foreR=limb(elbowR,.68,.105,skin);const handR=mesh(new THREE.SphereGeometry(.145,16,12),skin,elbowR,[.72,0,0],[0,0,0],[1.1,.78,.7]);
  const shoulderL=new THREE.Group();shoulderL.position.set(-.48,1.24,-.04);torsoPivot.add(shoulderL);const upperL=limb(shoulderL,.70,.13,coat);const elbowL=new THREE.Group();elbowL.position.x=.70;shoulderL.add(elbowL);limb(elbowL,.62,.105,skin);mesh(new THREE.SphereGeometry(.14,16,12),skin,elbowL,[.66,0,0],[0,0,0],[1.1,.78,.7]);

  const hipR=new THREE.Group();hipR.position.set(.27,-.15,0);pelvis.add(hipR);const thighR=limb(hipR,1.0,.17,pants);const kneeR=new THREE.Group();kneeR.position.x=1;hipR.add(kneeR);limb(kneeR,.95,.14,pants);const footR=new THREE.Group();footR.position.x=.96;kneeR.add(footR);shoe(footR,shoeMat);
  const hipL=new THREE.Group();hipL.position.set(-.27,-.15,-.03);pelvis.add(hipL);limb(hipL,1.0,.17,pants);const kneeL=new THREE.Group();kneeL.position.x=1;hipL.add(kneeL);limb(kneeL,.95,.14,pants);const footL=new THREE.Group();footL.position.x=.96;kneeL.add(footL);shoe(footL,shoeMat);
  // legs start downward
  hipR.rotation.z=-Math.PI/2-.06;hipL.rotation.z=-Math.PI/2+.08;kneeR.rotation.z=.07;kneeL.rotation.z=-.08;

  // ground shadow
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.85,32),new THREE.MeshBasicMaterial({color:0x3b2a22,transparent:true,opacity:.17,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-2.16,-.25);root.add(shadow);
  return {root,pelvis,torsoPivot,torso,neck,head,face,shoulderR,elbowR,handR,shoulderL,elbowL,hipR,kneeR,hipL,kneeL,shadow};
}

function solveArm(targetX,targetY){
  const sx=.48,sy=1.24,l1=.76,l2=.72;let dx=targetX-sx,dy=targetY-sy;let d=Math.hypot(dx,dy);d=clamp(d,.18,l1+l2-.025);const a=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));const base=Math.atan2(dy,dx);const shoulder=base-a;const elbow=Math.acos(clamp((d*d-l1*l1-l2*l2)/(2*l1*l2),-1,1));return {shoulder,elbow};
}

function mountUI(){
  const panel=$('#authoring-panel');if(!panel)return;
  controls=document.createElement('section');controls.id='v5-character-controls';controls.className='control-section accent-section';controls.innerHTML=`<div class="section-title-row"><h2>Character 3D / V5</h2><span class="selected-chip">LIVE RIG</span></div>
  <label class="toggle-row"><span>Character</span><input id="v5-enabled" type="checkbox" ${state.enabled?'checked':''}/></label>
  <label>Renderer <select id="v5-mode"><option value="3d" ${state.mode==='3d'?'selected':''}>AYA · Articulated 3D</option><option value="vector" ${state.mode==='vector'?'selected':''}>AYA · V4 Vector fallback</option></select></label>
  <label>Motion intensity <output id="v5-intensity-out">${Number(state.intensity).toFixed(2)}</output><input id="v5-intensity" type="range" min="0.35" max="1.6" step="0.05" value="${state.intensity}"/></label>
  <label>Character scale <output id="v5-scale-out">${Number(state.scale).toFixed(2)}</output><input id="v5-scale" type="range" min="0.70" max="1.35" step="0.01" value="${state.scale}"/></label>
  <label>Grip height <output id="v5-grip-out">${Number(state.gripHeight).toFixed(3)}</output><input id="v5-grip" type="range" min="0.62" max="0.84" step="0.005" value="${state.gripHeight}"/></label>
  <label>Depth <output id="v5-depth-out">${Number(state.depth).toFixed(2)}</output><input id="v5-depth" type="range" min="-1" max="1" step="0.05" value="${state.depth}"/></label>
  <div class="asset-status"><strong>Pipeline ready:</strong> Three.js articulated runtime → future rigged GLB templates from TRELLIS / Hunyuan.</div>`;
  panel.insertBefore(controls,panel.firstElementChild?.nextElementSibling||panel.firstChild);
  $('#v5-enabled').addEventListener('change',e=>{state.enabled=e.target.checked;persist();syncVisibility()});
  $('#v5-mode').addEventListener('change',e=>{state.mode=e.target.value;persist();syncVisibility()});
  for(const [id,key,out] of [['v5-intensity','intensity','v5-intensity-out'],['v5-scale','scale','v5-scale-out'],['v5-grip','gripHeight','v5-grip-out'],['v5-depth','depth','v5-depth-out']])$('#'+id).addEventListener('input',e=>{state[key]=Number(e.target.value);$('#'+out).textContent=key==='gripHeight'?state[key].toFixed(3):state[key].toFixed(2);persist()});
}

function syncVisibility(){const vector=$('#v4-character-layer');if(vector)vector.style.display=state.enabled&&state.mode==='vector'?'':'none';if(overlay)overlay.style.display=state.enabled&&state.mode==='3d'?'block':'none'}

function init3D(){
  const shell=$('#stage-shell');if(!shell)return setTimeout(init3D,80);
  overlay=document.createElement('canvas');overlay.id='v5-character-canvas';overlay.setAttribute('aria-label','V5 articulated 3D narrative character');Object.assign(overlay.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'10'});shell.appendChild(overlay);
  renderer=new THREE.WebGLRenderer({canvas:overlay,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(0,0,11.5);
  scene.add(new THREE.HemisphereLight(0xfff3df,0x40352f,1.8));const key=new THREE.DirectionalLight(0xffd2a8,3.2);key.position.set(-3,6,7);key.castShadow=true;scene.add(key);const rim=new THREE.DirectionalLight(0x9fc9ff,1.1);rim.position.set(5,3,-5);scene.add(rim);
  rig=createCharacter();scene.add(rig.root);rig.root.rotation.y=-.06;
  const resize=()=>{const r=shell.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()};resize();resizeObserver=new ResizeObserver(resize);resizeObserver.observe(shell);
  mountUI();syncVisibility();bindMotion();document.title='Hanging Media Studio V5 — 3D Character Template Proof';requestAnimationFrame(tick);
}

function bindMotion(){const canvas=$('#stage');if(!canvas)return;canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastT=performance.now();targetEffort=.3;releaseAt=0;satisfactionUntil=0;setState('grab')});canvas.addEventListener('pointermove',e=>{if(!dragging)return;const now=performance.now(),dt=Math.max(16,now-lastT),dx=e.clientX-lastX;lastX=e.clientX;lastT=now;direction=dx<0?1:-1;targetEffort=clamp(.36+Math.abs(dx)/dt*3.8,.36,1);setState(targetEffort>.58?'effort':'pull')});const release=()=>{if(!dragging)return;dragging=false;targetEffort=.14;releaseAt=performance.now()+320;satisfactionUntil=performance.now()+1450;setState('release')};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('wheel',e=>{direction=e.deltaY>0?1:-1;targetEffort=clamp(.34+Math.abs(e.deltaY)*.004,.34,1);wheelUntil=performance.now()+320;setState('pull')},{passive:true})}
function setState(s){if(overlay)overlay.dataset.state=s}

function tick(now=performance.now()){
  if(!renderer||!rig)return;const auto=Number($('[data-control="autoDrift"]')?.value||0);let narrative=overlay.dataset.state||'idle';
  if(!dragging&&now>wheelUntil){if(now<releaseAt){targetEffort=.12;narrative='release'}else if(now<satisfactionUntil){targetEffort=.055;narrative='satisfaction'}else if(auto>.001){targetEffort=.20+Math.sin(now*.004)*.045;narrative='pull'}else{targetEffort=.035+Math.sin(now*.0016)*.012;narrative='idle'}}
  effort+=(targetEffort-effort)*.12;const q=clamp(effort*Number(state.intensity||1),0,1.25),sat=narrative==='satisfaction'?1:0,breath=Math.sin(now*.0021)*.018;
  overlay.dataset.state=narrative;overlay.dataset.effort=q.toFixed(3);overlay.dataset.rig='articulated-3d';overlay.dataset.template='AYA_3D';
  const aspect=camera.aspect;const viewHeight=2*11.5*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));const viewWidth=viewHeight*aspect;
  const baseX=-viewWidth*.39;const baseY=-viewHeight*.14;rig.root.position.set(baseX+(-direction*q*.08),baseY+breath,Number(state.depth||0));rig.root.scale.setScalar(Number(state.scale||1));
  // pull effort: centre of mass moves backwards and down, legs brace
  rig.pelvis.rotation.z=direction*(-.035-q*.075);rig.pelvis.position.x=-direction*q*.055;rig.pelvis.position.y=-.15-q*.055+sat*.035;
  rig.torsoPivot.rotation.z=direction*(-.02-q*.16+sat*.025);rig.torsoPivot.position.y=.75-q*.025+sat*.03;
  rig.neck.rotation.z=direction*(q*.07-sat*.035);rig.head.rotation.z=direction*(-q*.08+sat*.045);rig.head.rotation.x=-q*.025-sat*.03;
  rig.hipR.rotation.z=-Math.PI/2-direction*q*.08;rig.hipL.rotation.z=-Math.PI/2+direction*q*.11;rig.kneeR.rotation.z=.08+q*.15;rig.kneeL.rotation.z=-.08-q*.10;
  // counter arm swings behind body under effort
  rig.shoulderL.rotation.z=Math.PI*.72+direction*(.22+q*.28);rig.elbowL.rotation.z=-.55-q*.22;
  // hand target is placed on the visible real rope band; pull draws it toward body
  const ropeY=lerp(1.85,2.36,(Number(state.gripHeight||.735)-.62)/.22);const grabX=1.72-direction*q*.28;const grabY=ropeY-q*.13+sat*.08;const ik=solveArm(grabX,grabY);rig.shoulderR.rotation.z=ik.shoulder;rig.elbowR.rotation.z=ik.elbow;
  // expression
  const hard=q>.46&&narrative!=='satisfaction';rig.face.mouthNeutral.visible=!hard&&!sat;rig.face.mouthEffort.visible=hard;rig.face.mouthSmile.visible=Boolean(sat);rig.face.browL.rotation.z=hard?.20:sat?-.11:-.12;rig.face.browR.rotation.z=hard?-.20:sat?.11:.12;rig.face.browL.position.y=hard?.025:0;rig.face.browR.position.y=hard?.025:0;
  rig.shadow.material.opacity=.14+q*.07;rig.shadow.scale.set(1+q*.08,1-q*.05,1);
  renderer.render(scene,camera);requestAnimationFrame(tick)
}

function boot(){const oldControls=$('#v4-character-controls');if(oldControls)oldControls.style.display='none';init3D()}
boot();
