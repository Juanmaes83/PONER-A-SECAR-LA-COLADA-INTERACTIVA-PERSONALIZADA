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
  if(!label)return setTimeout(mount,60);
  const input=document.createElement('input');
  input.id='v5-1-logo-direct';
  input.type='file';
  input.accept='image/*,.svg';
  input.hidden=true;
  input.addEventListener('change',async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    syncBrandingControls();
    const canonical=$('#v3-logo');
    if(canonical&&typeof canonical.onchange==='function'){
      const dt=new DataTransfer();
      dt.items.add(file);
      canonical.files=dt.files;
      await canonical.onchange({target:canonical,currentTarget:canonical,type:'change'});
    }
    e.target.value='';
  });
  const button=document.createElement('button');
  button.id='v5-1-logo-trigger';
  button.type='button';
  button.className='secondary-button';
  button.textContent='+ Upload logo';
  button.addEventListener('click',()=>input.click());
  label.replaceWith(button);
  legacy.replaceWith(input);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
