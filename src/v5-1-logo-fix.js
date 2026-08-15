const $=(s,r=document)=>r.querySelector(s);

function syncBrandingControls(){
  const scope=$('#v5-1-brand-scope'),position=$('#v5-1-brand-position'),size=$('#v5-1-brand-size'),color=$('#v5-1-brand-color'),opacity=$('#v5-1-brand-opacity');
  if(scope&&$('#v3-layer-scope'))$('#v3-layer-scope').value=scope.value;
  if(position&&$('#v3-layer-position'))$('#v3-layer-position').value=position.value;
  if(size&&$('#v3-layer-size'))$('#v3-layer-size').value=size.value;
  if(color&&$('#v3-layer-color'))$('#v3-layer-color').value=color.value;
  if(opacity&&$('#v3-layer-opacity'))$('#v3-layer-opacity').value=opacity.value;
}

async function addImageFile(file){
  if(!file)return;
  syncBrandingControls();
  await window.HangingMediaV3.addImageLayer(file,'logo');
  const status=$('#v3-status');
  if(status)status.textContent=`Logo / image added · ${file.name}`;
}

function mount(){
  const input=$('#v5-1-logo');
  const label=document.querySelector('label[for="v5-1-logo"]');
  if(!input||!label||!window.HangingMediaV3?.addImageLayer)return setTimeout(mount,60);
  if($('#v5-1-logo-trigger'))return;

  input.hidden=true;
  input.accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg';
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];
    if(!file)return;
    try{await addImageFile(file)}catch(err){console.error('V5.1 logo/image upload failed',err)}finally{input.value=''}
  });

  const button=document.createElement('button');
  button.id='v5-1-logo-trigger';
  button.type='button';
  button.className='secondary-button';
  button.textContent='+ Upload logo / image';
  button.setAttribute('aria-controls','v5-1-logo');
  button.addEventListener('click',()=>{syncBrandingControls();input.click()});
  label.replaceWith(button);

  window.HangingMediaV51=window.HangingMediaV51||{};
  window.HangingMediaV51.addImageFile=addImageFile;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
