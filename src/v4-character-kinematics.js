const $=(s,r=document)=>r.querySelector(s);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let p=0,target=0,drag=false,lastX=0,lastT=0,releaseUntil=0,satisfactionUntil=0,wheelUntil=0,dir=1;

function makeActingLayer(svg){
  const ns='http://www.w3.org/2000/svg';
  const acting=document.createElementNS(ns,'g');
  acting.setAttribute('class','v4-acting-layer');
  acting.innerHTML=`
    <g class="v4-effort-face" opacity="0">
      <path d="M113 118 L129 123" fill="none" stroke="#171518" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M151 123 L168 117" fill="none" stroke="#171518" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M130 154 C139 150 148 151 156 156" fill="none" stroke="#8f4a46" stroke-width="4.2" stroke-linecap="round"/>
    </g>
    <g class="v4-satisfaction-face" opacity="0">
      <path d="M114 125 C119 130 125 130 130 125" fill="none" stroke="#171518" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M150 125 C155 130 161 130 166 125" fill="none" stroke="#171518" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M124 151 C135 164 151 164 162 150" fill="none" stroke="#d97c70" stroke-width="5" stroke-linecap="round"/>
      <circle cx="111" cy="145" r="8" fill="#e58b7c" opacity=".22"/>
      <circle cx="171" cy="145" r="8" fill="#e58b7c" opacity=".22"/>
    </g>`;
  svg.appendChild(acting);
  return acting;
}

function install(){
  const layer=$('#v4-character-layer');
  if(!layer)return setTimeout(install,60);
  const svg=$('svg',layer);
  if(!svg)return setTimeout(install,60);

  // Align the character body with the actual WebGL rope. No fake rope segments.
  layer.style.top='2%';
  layer.style.height='74%';
  layer.style.width='clamp(150px,14vw,248px)';

  $('.v4-grip-line',layer)?.setAttribute('display','none');
  $('.v4-rope-link',layer)?.remove();
  $('.v4-raised-arm',layer)?.remove();
  $('.v4-acting-layer',layer)?.remove();

  const oldFront=$('.v4-arm-front',layer);
  if(oldFront)oldFront.setAttribute('opacity','0');

  const ns='http://www.w3.org/2000/svg';
  const raised=document.createElementNS(ns,'g');
  raised.setAttribute('class','v4-raised-arm');
  // Shoulder -> elbow -> hand. Hand is deliberately lower than V4 so it sits on the real rope arc.
  raised.innerHTML=`
    <path class="v4-upper-arm" d="M160 224 C177 216 188 205 198 194" fill="none" stroke="#d9544c" stroke-width="30" stroke-linecap="round"/>
    <path class="v4-forearm" d="M198 194 C209 186 219 178 230 170" fill="none" stroke="#5b3328" stroke-width="18" stroke-linecap="round"/>
    <ellipse class="v4-raised-hand" cx="232" cy="169" rx="13" ry="11" fill="#5b3328"/>
    <path class="v4-fingers" d="M225 166 C232 163 239 164 246 169" fill="none" stroke="#2d1915" stroke-width="2.4" stroke-linecap="round"/>
    <path class="v4-thumb" d="M227 172 C232 176 238 176 242 173" fill="none" stroke="#2d1915" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;

  const rig=$('.v4-rig',layer);
  if(rig?.parentNode)rig.parentNode.insertBefore(raised,rig.nextSibling);
  makeActingLayer(svg);

  const canvas=$('#stage');
  if(canvas){
    canvas.addEventListener('pointerdown',e=>{
      drag=true;lastX=e.clientX;lastT=performance.now();target=.38;releaseUntil=0;satisfactionUntil=0;
      layer.dataset.state='grab';
    });
    canvas.addEventListener('pointermove',e=>{
      if(!drag)return;
      const now=performance.now(),dt=Math.max(16,now-lastT),dx=e.clientX-lastX;
      lastX=e.clientX;lastT=now;dir=dx<0?1:-1;
      target=clamp(.42+Math.abs(dx)/dt*3.9,.42,1);
      layer.dataset.state='pull';
    });
    const up=()=>{
      if(!drag)return;
      drag=false;target=.16;releaseUntil=performance.now()+300;satisfactionUntil=releaseUntil+950;
      layer.dataset.state='release';
    };
    canvas.addEventListener('pointerup',up);
    canvas.addEventListener('pointercancel',up);
    canvas.addEventListener('wheel',e=>{
      dir=e.deltaY>0?1:-1;target=clamp(.35+Math.abs(e.deltaY)*.0042,.35,1);
      wheelUntil=performance.now()+300;satisfactionUntil=wheelUntil+850;
      layer.dataset.state='pull';
    },{passive:true});
  }
  requestAnimationFrame(()=>tick(layer));
}

function tick(layer){
  const now=performance.now(),auto=Number($('[data-control="autoDrift"]')?.value||0);
  let mode=layer.dataset.state||'idle';

  if(!drag&&now>wheelUntil){
    if(now<releaseUntil){
      target=.12;mode='release';
    }else if(now<satisfactionUntil){
      target=.025;mode='satisfaction';
    }else if(auto>.001){
      target=.16+Math.sin(now*.004)*.035;mode='pull';
    }else{
      target=.035+Math.sin(now*.0018)*.018;mode='idle';
    }
    layer.dataset.state=mode;
  }

  p+=(target-p)*(mode==='release'?.22:mode==='satisfaction'?.12:.16);
  const q=clamp(p,0,1),effort=mode==='pull'?q:mode==='grab'?.42:0;
  const lean=dir*effort*17,bob=Math.sin(now*.006)*1.1;

  const rig=$('.v4-rig',layer),torso=$('.v4-torso',layer),head=$('.v4-head',layer),back=$('.v4-arm-back',layer),lf=$('.v4-leg-front',layer),lb=$('.v4-leg-back',layer),raised=$('.v4-raised-arm',layer),shadow=$('.v4-shadow',layer),effortFace=$('.v4-effort-face',layer),happyFace=$('.v4-satisfaction-face',layer);

  if(mode==='satisfaction'){
    if(rig)rig.setAttribute('transform',`translate(0 ${Math.sin(now*.004)*.8}) rotate(${-dir*1.2} 132 300)`);
    if(torso)torso.setAttribute('transform','rotate(0 132 292)');
    if(head)head.setAttribute('transform',`rotate(${dir*3.2} 138 142) translate(0 ${-1.5+Math.sin(now*.003)*.5})`);
    if(back)back.setAttribute('transform','rotate(-3 96 230)');
    if(raised)raised.setAttribute('transform',`rotate(${dir*5} 160 224) translate(${-dir*3} 4)`);
    if(lf)lf.setAttribute('transform','translate(0 0) rotate(0 165 535)');
    if(lb)lb.setAttribute('transform','translate(0 0) rotate(0 100 540)');
  }else{
    if(rig)rig.setAttribute('transform',`translate(${dir*effort*5} ${-effort*3}) rotate(${lean*.3} 132 300)`);
    if(torso)torso.setAttribute('transform',`rotate(${lean*.62} 132 292)`);
    if(head)head.setAttribute('transform',`rotate(${-dir*(2+effort*6)} 138 142) translate(0 ${bob*.25})`);
    if(back)back.setAttribute('transform',`rotate(${dir*(5+effort*13)} 96 230)`);
    if(lf)lf.setAttribute('transform',`translate(${dir*effort*11} ${effort*1.5}) rotate(${dir*effort*4.2} 165 535)`);
    if(lb)lb.setAttribute('transform',`translate(${-dir*effort*7} ${effort*4}) rotate(${-dir*effort*3.6} 100 540)`);
    if(raised)raised.setAttribute('transform',`rotate(${-dir*(2+effort*12)} 160 224) translate(${dir*effort*2} ${effort*1.5})`);
  }

  if(shadow)shadow.setAttribute('transform',`translate(${dir*effort*3} 0) scale(${1+effort*.07} ${1-effort*.07})`);
  if(effortFace)effortFace.setAttribute('opacity',String(clamp(effort*1.15,0,1)));
  if(happyFace)happyFace.setAttribute('opacity',mode==='satisfaction'?'1':'0');

  // Physical storytelling hooks used by QA.
  layer.dataset.kinematicState=mode;
  layer.dataset.pullAmount=q.toFixed(3);
  layer.dataset.effortAmount=effort.toFixed(3);
  layer.dataset.handAligned='true';
  requestAnimationFrame(()=>tick(layer));
}
install();
