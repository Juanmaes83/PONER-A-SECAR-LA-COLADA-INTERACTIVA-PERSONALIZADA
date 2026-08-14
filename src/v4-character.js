const KEY='hanging-media-character-v4';
const state={enabled:true,intensity:1,...(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}})()};
const $=(s,r=document)=>r.querySelector(s);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let dragging=false,lastX=0,lastT=0,pull=0,targetPull=0,releaseUntil=0,wheelUntil=0;

function persist(){localStorage.setItem(KEY,JSON.stringify(state))}
function characterSvg(){return `<svg viewBox="0 0 240 620" role="img" aria-label="Original editorial character pulling the hanging line" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="jacket" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ef6e56"/><stop offset="1" stop-color="#b84245"/></linearGradient>
  <linearGradient id="pants" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#263e72"/><stop offset="1" stop-color="#17264e"/></linearGradient>
  <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#714332"/><stop offset="1" stop-color="#4a2a22"/></linearGradient>
  <linearGradient id="shoe" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6eee2"/><stop offset="1" stop-color="#cfc5b8"/></linearGradient>
  <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>
<ellipse class="v4-shadow" cx="115" cy="585" rx="72" ry="15" fill="#2d211a" opacity=".18" filter="url(#softShadow)"/>
<g class="v4-rig">
  <g class="v4-leg-back" transform="translate(0 0)">
    <path d="M106 375 C95 422 90 482 88 545 L117 545 C123 488 131 431 137 385Z" fill="url(#pants)"/>
    <path d="M86 541 C72 548 65 558 63 572 C82 577 102 575 121 565 L116 543Z" fill="url(#shoe)"/>
    <path d="M68 567 C82 571 100 568 118 560" fill="none" stroke="#c95e4f" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g class="v4-leg-front">
    <path d="M137 380 C143 431 151 482 160 540 L190 540 C186 475 181 420 171 374Z" fill="url(#pants)"/>
    <path d="M158 537 C150 551 151 565 156 577 C178 580 199 575 215 563 L190 540Z" fill="url(#shoe)"/>
    <path d="M159 571 C177 574 196 568 210 559" fill="none" stroke="#c95e4f" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g class="v4-torso">
    <path d="M86 205 C111 184 151 185 176 210 C180 259 181 319 168 390 C143 404 110 402 84 387 C75 324 76 258 86 205Z" fill="url(#jacket)"/>
    <path d="M125 199 C133 247 139 313 134 391" fill="none" stroke="#f7b2a3" stroke-width="3" opacity=".75"/>
    <path d="M100 242 C119 253 143 253 163 240" fill="none" stroke="#8e2d38" stroke-width="5" opacity=".55"/>
    <path d="M102 314 C118 308 137 307 157 314" fill="none" stroke="#8e2d38" stroke-width="4" opacity=".5"/>
    <path d="M104 369 C124 377 146 375 164 367" fill="none" stroke="#8e2d38" stroke-width="4" opacity=".5"/>
    <circle cx="127" cy="231" r="5" fill="#f5c36d"/><circle cx="131" cy="269" r="5" fill="#f5c36d"/><circle cx="134" cy="307" r="5" fill="#f5c36d"/>
  </g>
  <g class="v4-arm-back" transform-origin="96px 230px">
    <path d="M99 224 C72 236 56 260 49 293 C56 306 69 309 80 300 C90 274 102 254 117 245Z" fill="url(#jacket)"/>
    <path d="M51 289 C42 309 38 326 43 343 C51 348 62 345 68 336 C68 317 72 304 80 294Z" fill="url(#skin)"/>
  </g>
  <g class="v4-arm-front" transform-origin="166px 225px">
    <path d="M163 218 C184 223 199 242 203 266 C199 279 185 285 174 276 C164 255 154 242 143 235Z" fill="url(#jacket)"/>
    <path d="M200 261 C208 253 219 248 231 248 C240 252 243 262 237 269 C224 274 214 282 205 294 C194 291 188 278 191 269Z" fill="url(#skin)"/>
    <ellipse class="v4-hand" cx="230" cy="258" rx="12" ry="10" fill="url(#skin)"/>
    <path d="M224 254 C231 252 238 253 244 258" fill="none" stroke="#36201a" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
  </g>
  <g class="v4-neck"><path d="M121 171 L151 170 L154 207 C143 217 128 216 118 205Z" fill="url(#skin)"/></g>
  <g class="v4-head" transform-origin="138px 142px">
    <ellipse cx="139" cy="132" rx="42" ry="49" fill="url(#skin)"/>
    <path d="M100 128 C95 91 116 67 145 69 C177 70 194 96 182 128 C170 111 158 99 138 95 C124 102 113 113 100 128Z" fill="#171518"/>
    <path d="M108 95 C87 87 79 67 91 50 C109 51 124 61 132 76 C128 84 119 91 108 95Z" fill="#171518"/>
    <path d="M153 75 C163 51 183 39 203 47 C207 67 194 85 176 95 C164 91 156 84 153 75Z" fill="#171518"/>
    <ellipse cx="113" cy="132" rx="14" ry="16" fill="#e6a28e" opacity=".38"/><ellipse cx="166" cy="132" rx="14" ry="16" fill="#e6a28e" opacity=".38"/>
    <path d="M113 125 L128 121" stroke="#161317" stroke-width="4" stroke-linecap="round"/><path d="M151 121 L167 125" stroke="#161317" stroke-width="4" stroke-linecap="round"/>
    <circle cx="123" cy="126" r="3.8" fill="#f4ede3"/><circle cx="158" cy="126" r="3.8" fill="#f4ede3"/>
    <circle cx="124" cy="126" r="1.8" fill="#171518"/><circle cx="157" cy="126" r="1.8" fill="#171518"/>
    <path d="M135 139 C138 143 142 143 146 140" fill="none" stroke="#3c201c" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M125 154 C137 160 149 159 159 151" fill="none" stroke="#cf6f67" stroke-width="5" stroke-linecap="round"/>
    <path d="M108 108 C129 96 152 96 173 108" fill="none" stroke="#f0c66c" stroke-width="8" stroke-linecap="round"/>
    <circle cx="103" cy="111" r="12" fill="#f0c66c"/><circle cx="177" cy="111" r="12" fill="#f0c66c"/>
  </g>
  <g class="v4-scarf"><path d="M113 197 C129 190 149 190 164 197 C151 210 127 210 113 197Z" fill="#f1dba7"/><path d="M151 201 C163 221 166 241 158 259" fill="none" stroke="#f1dba7" stroke-width="9" stroke-linecap="round"/></g>
</g>
<g class="v4-grip-line"><path d="M229 258 C245 257 257 257 270 257" fill="none" stroke="#a47f4f" stroke-width="6" stroke-linecap="round"/><path d="M230 258 C244 258 257 258 270 258" fill="none" stroke="#d1ac76" stroke-width="1.4" stroke-dasharray="2 5" stroke-linecap="round"/></g>
</svg>`}
function css(){const s=document.createElement('style');s.id='v4-character-css';s.textContent=`
#v4-character-layer{position:absolute;left:clamp(18px,2.8vw,58px);top:12%;width:clamp(132px,13vw,230px);height:76%;z-index:9;pointer-events:none;filter:drop-shadow(0 12px 18px rgba(40,26,18,.12));transform-origin:50% 80%;transition:opacity .35s ease;will-change:transform}
#v4-character-layer.is-hidden{opacity:0;visibility:hidden}.v4-character-svg{width:100%;height:100%;overflow:visible}.v4-character-svg svg{width:100%;height:100%;overflow:visible}.v4-rig,.v4-torso,.v4-arm-front,.v4-arm-back,.v4-leg-front,.v4-leg-back,.v4-head,.v4-scarf{will-change:transform}.v4-grip-line{transform:translateX(0);opacity:.95}
#v4-character-controls{border-top:1px solid rgba(255,255,255,.12);padding:14px 12px 16px;background:linear-gradient(180deg,rgba(239,110,86,.055),transparent)}#v4-character-controls .v4-kicker{font-size:9px;letter-spacing:.16em;text-transform:uppercase;opacity:.55;margin-bottom:4px}#v4-character-controls .v4-character-name{font-size:12px;font-weight:600;margin-bottom:9px}#v4-character-controls .v4-character-note{font-size:10px;line-height:1.45;opacity:.55;margin:7px 0 0}#v4-character-controls .toggle-row{margin-top:8px}
body.v3-experience-mode #v4-character-controls{display:none!important}.v3-client-viewer #v4-character-controls{display:none!important}
`;document.head.appendChild(s)}
function mount(){const shell=$('#stage-shell'),panel=$('#authoring-panel');if(!shell||!panel)return setTimeout(mount,80);css();document.title='Hanging Media Studio V4 — Narrative Character';const layer=document.createElement('div');layer.id='v4-character-layer';layer.className=state.enabled?'':'is-hidden';layer.innerHTML=`<div class="v4-character-svg">${characterSvg()}</div>`;shell.appendChild(layer);const controls=document.createElement('section');controls.id='v4-character-controls';controls.className='control-section';controls.innerHTML=`<div class="v4-kicker">Narrative Character Layer / V4</div><div class="v4-character-name">AYA · Original editorial rig</div><label class="toggle-row"><span>Character</span><input id="v4-character-enabled" type="checkbox" ${state.enabled?'checked':''}/></label><label>Motion intensity <output id="v4-character-intensity-out">${state.intensity.toFixed(2)}</output><input id="v4-character-intensity" type="range" min="0.35" max="1.5" step="0.05" value="${state.intensity}"/></label><p class="v4-character-note">Idle → grab → pull → release. Movement follows rope navigation and drag gestures.</p>`;panel.insertBefore(controls,$('#v3-studio')||panel.firstChild?.nextSibling||null);$('#v4-character-enabled').addEventListener('change',e=>{state.enabled=e.target.checked;layer.classList.toggle('is-hidden',!state.enabled);persist()});$('#v4-character-intensity').addEventListener('input',e=>{state.intensity=Number(e.target.value);$('#v4-character-intensity-out').textContent=state.intensity.toFixed(2);persist()});bindMotion(layer);requestAnimationFrame(()=>animate(layer));}
function bindMotion(layer){const canvas=$('#stage');if(!canvas)return;canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastT=performance.now();targetPull=.35;releaseUntil=0;layer.dataset.state='grab'});canvas.addEventListener('pointermove',e=>{if(!dragging)return;const now=performance.now(),dt=Math.max(16,now-lastT),dx=e.clientX-lastX;lastX=e.clientX;lastT=now;const v=Math.abs(dx)/dt;targetPull=clamp(.28+v*2.8,0,1);layer.dataset.direction=dx<0?'forward':'back';layer.dataset.state='pull'});const release=()=>{if(!dragging)return;dragging=false;targetPull=.18;releaseUntil=performance.now()+380;layer.dataset.state='release'};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('wheel',e=>{targetPull=clamp(.28+Math.abs(e.deltaY)*.0035,0,1);wheelUntil=performance.now()+260;layer.dataset.direction=e.deltaY>0?'forward':'back';layer.dataset.state='pull'},{passive:true});}
function animate(layer){const now=performance.now(),auto=Number($('[data-control="autoDrift"]')?.value||0);if(!dragging&&now>wheelUntil&&now>releaseUntil){if(auto>.001){targetPull=.18+Math.sin(now*.004)*.055;layer.dataset.state='pull'}else{targetPull=.04+Math.sin(now*.0018)*.025;layer.dataset.state='idle'}}else if(!dragging&&now>releaseUntil&&now<=wheelUntil){layer.dataset.state='pull'}pull+=(targetPull-pull)*.14;const p=clamp(pull*state.intensity,0,1.35),dir=layer.dataset.direction==='back'?-1:1,bob=Math.sin(now*.006)*2.2*(1-p*.35),lean=dir*p*9,step=dir*p*7;layer.style.transform=`translate3d(${dir*p*4}px,${bob}px,0) rotate(${lean*.18}deg)`;const rig=$('.v4-rig',layer),torso=$('.v4-torso',layer),front=$('.v4-arm-front',layer),back=$('.v4-arm-back',layer),head=$('.v4-head',layer),lf=$('.v4-leg-front',layer),lb=$('.v4-leg-back',layer),shadow=$('.v4-shadow',layer),grip=$('.v4-grip-line',layer);if(rig)rig.style.transform=`translate(${dir*p*2}px ${-p*2}px) rotate(${lean*.34}deg)`;if(torso)torso.style.transform=`rotate(${lean*.52}deg)`;if(front)front.style.transform=`rotate(${dir*(-12-20*p)}deg) translate(${dir*p*5}px ${p*2}px)`;if(back)back.style.transform=`rotate(${dir*(5+8*p)}deg)`;if(head)head.style.transform=`rotate(${dir*(-2-lean*.2)}deg) translateY(${Math.sin(now*.0025)*1.2}px)`;if(lf)lf.style.transform=`translate(${step}px 0) rotate(${dir*p*2.2}deg)`;if(lb)lb.style.transform=`translate(${-step*.65}px ${p*2}px) rotate(${-dir*p*1.8}deg)`;if(shadow)shadow.style.transform=`scale(${1+p*.05} ${1-p*.06})`;if(grip)grip.style.transform=`translateX(${dir*p*8}px)`;requestAnimationFrame(()=>animate(layer))}
mount();
