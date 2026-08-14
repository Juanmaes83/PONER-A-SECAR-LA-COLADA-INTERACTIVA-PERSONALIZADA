const $=(s,r=document)=>r.querySelector(s);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let p=0,target=0,drag=false,lastX=0,lastT=0,releaseUntil=0,wheelUntil=0,dir=1;
function install(){const layer=$('#v4-character-layer');if(!layer)return setTimeout(install,60);const svg=$('svg',layer);if(!svg)return setTimeout(install,60);
  layer.style.top='-3%';layer.style.height='70%';layer.style.width='clamp(150px,14vw,248px)';
  const oldFront=$('.v4-arm-front',layer);if(oldFront)oldFront.setAttribute('opacity','0');
  const ns='http://www.w3.org/2000/svg';
  const raised=document.createElementNS(ns,'g');raised.setAttribute('class','v4-raised-arm');
  raised.innerHTML=`<path d="M160 221 C175 201 184 181 193 160" fill="none" stroke="#d9544c" stroke-width="29" stroke-linecap="round"/><path d="M193 160 C204 143 215 123 227 106" fill="none" stroke="#5b3328" stroke-width="18" stroke-linecap="round"/><ellipse class="v4-raised-hand" cx="229" cy="104" rx="13" ry="11" fill="#5b3328"/><path d="M224 101 C231 99 238 101 244 105" fill="none" stroke="#2d1915" stroke-width="2.2" stroke-linecap="round"/>`;
  const ropeLink=document.createElementNS(ns,'g');ropeLink.setAttribute('class','v4-rope-link');ropeLink.innerHTML=`<path class="v4-rope-main" d="M231 104 C264 101 305 100 355 101" fill="none" stroke="#8d6a41" stroke-width="6" stroke-linecap="round"/><path d="M231 104 C264 101 305 100 355 101" fill="none" stroke="#d5b17d" stroke-width="1.4" stroke-dasharray="2 5" stroke-linecap="round"/>`;
  const rig=$('.v4-rig',layer);if(rig?.parentNode){rig.parentNode.insertBefore(raised,rig.nextSibling);rig.parentNode.insertBefore(ropeLink,raised.nextSibling)}
  const canvas=$('#stage');if(canvas){canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastT=performance.now();target=.34;releaseUntil=0;layer.dataset.state='grab'});canvas.addEventListener('pointermove',e=>{if(!drag)return;const now=performance.now(),dt=Math.max(16,now-lastT),dx=e.clientX-lastX;lastX=e.clientX;lastT=now;dir=dx<0?1:-1;target=clamp(.35+Math.abs(dx)/dt*3.4,.35,1);layer.dataset.state='pull'});const up=()=>{if(!drag)return;drag=false;target=.18;releaseUntil=performance.now()+420;layer.dataset.state='release'};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',e=>{dir=e.deltaY>0?1:-1;target=clamp(.32+Math.abs(e.deltaY)*.004,.32,1);wheelUntil=performance.now()+300;layer.dataset.state='pull'},{passive:true})}
  requestAnimationFrame(()=>tick(layer));
}
function tick(layer){const now=performance.now(),auto=Number($('[data-control="autoDrift"]')?.value||0);if(!drag&&now>wheelUntil){if(now<releaseUntil){target=.12}else if(auto>.001){target=.20+Math.sin(now*.004)*.04;layer.dataset.state='pull'}else{target=.045+Math.sin(now*.0018)*.02;layer.dataset.state='idle'}}p+=(target-p)*.16;const q=clamp(p,0,1),lean=dir*q*12,bob=Math.sin(now*.006)*1.3;
  const rig=$('.v4-rig',layer),torso=$('.v4-torso',layer),head=$('.v4-head',layer),back=$('.v4-arm-back',layer),lf=$('.v4-leg-front',layer),lb=$('.v4-leg-back',layer),raised=$('.v4-raised-arm',layer),rope=$('.v4-rope-link',layer),shadow=$('.v4-shadow',layer);
  if(rig)rig.setAttribute('transform',`translate(${dir*q*3} ${-q*2}) rotate(${lean*.28} 132 300)`);
  if(torso)torso.setAttribute('transform',`rotate(${lean*.48} 132 292)`);
  if(head)head.setAttribute('transform',`rotate(${-dir*(2+q*4)} 138 142) translate(0 ${bob*.3})`);
  if(back)back.setAttribute('transform',`rotate(${dir*(4+q*9)} 96 230)`);
  if(lf)lf.setAttribute('transform',`translate(${dir*q*8} 0) rotate(${dir*q*2.5} 165 535)`);
  if(lb)lb.setAttribute('transform',`translate(${-dir*q*5} ${q*3}) rotate(${-dir*q*2} 100 540)`);
  if(raised)raised.setAttribute('transform',`rotate(${-dir*(4+q*14)} 160 221) translate(${dir*q*4} ${-q*3})`);
  if(rope)rope.setAttribute('transform',`translate(${dir*q*6} ${-q*2}) scale(${1+q*.035} 1)`);
  if(shadow)shadow.setAttribute('transform',`translate(${dir*q*2} 0) scale(${1+q*.05} ${1-q*.05})`);
  layer.dataset.kinematicState=layer.dataset.state||'idle';layer.dataset.pullAmount=q.toFixed(3);
  requestAnimationFrame(()=>tick(layer));
}
install();
