const $=(s,r=document)=>r.querySelector(s);

function syncBrandingControls(){
  const scope=$('#v5-1-brand-scope'),position=$('#v5-1-brand-position'),size=$('#v5-1-brand-size'),color=$('#v5-1-brand-color'),opacity=$('#v5-1-brand-opacity');
  if(scope&&$('#v3-layer-scope'))$('#v3-layer-scope').value=scope.value;
  if(position&&$('#v3-layer-position'))$('#v3-layer-position').value=position.value;
  if(size&&$('#v3-layer-size'))$('#v3-layer-size').value=size.value;
  if(color&&$('#v3-layer-color'))$('#v3-layer-color').value=color.value;
  if(opacity&&$('#v3-layer-opacity'))$('#v3-layer-opacity').value=opacity.value;
}

function mount(){
  const legacy=$('#v5-1-logo');
  if(!legacy)return setTimeout(mount,60);
  const label=document.querySelector('label[for="v5-1-logo"]');
  if(!label||!window.HangingMediaV3?.addImageLayer)return setTimeout(mount,60);

  legacy.accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg';
  legacy.onchange=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    syncBrandingControls();
    try{
      await window.HangingMediaV3.addImageLayer(file,'logo');
      const status=$('#v3-status');
      if(status)status.textContent=`Logo / image added · ${file.name}`;
    }catch(err){
      console.error('V5.1 logo/image upload failed',err);
    }finally{
      e.target.value='';
    }
  };

  const button=document.createElement('button');
  button.id='v5-1-logo-trigger';
  button.type='button';
  button.className='secondary-button';
  button.textContent='+ Upload logo / image';
  button.addEventListener('click',()=>{
    syncBrandingControls();
    legacy.click();
  });

  label.replaceWith(button);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
