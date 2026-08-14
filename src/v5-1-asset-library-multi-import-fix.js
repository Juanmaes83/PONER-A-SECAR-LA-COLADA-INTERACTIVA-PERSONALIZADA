const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function boot(){
  let tries=0;
  while((!window.HangingMediaV51AssetLibrary||!document.querySelector('#v51al-upload'))&&tries++<120)await sleep(50);
  const api=window.HangingMediaV51AssetLibrary,input=document.querySelector('#v51al-upload');
  if(!api||!input)return;
  const original=api.importFiles.bind(api);
  let queue=Promise.resolve();
  async function importSelection(fileList){
    const files=[...fileList];
    const archives=files.filter(f=>/\.(zip|glb)$/i.test(f.name));
    const loose=files.filter(f=>!/\.(zip|glb)$/i.test(f.name));
    const groups=archives.map(f=>[f]);
    if(loose.length)groups.push(loose);
    if(!groups.length)return;
    for(const group of groups){
      await original(group);
      await sleep(180);
    }
  }
  api.importFiles=importSelection;
  input.addEventListener('change',e=>{
    if(!e.target.files?.length)return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const files=[...e.target.files];
    e.target.value='';
    queue=queue.then(()=>new Promise(resolve=>setTimeout(resolve,0))).then(()=>importSelection(files)).catch(err=>{
      console.error('V5.1 multi-import queue failed',err);
      const status=document.querySelector('#v51al-status');
      if(status)status.textContent=`Multi-import failed · ${err.message}`;
    });
  },true);
  window.__V51_MULTI_IMPORT_FIX__={ready:true,wait:()=>queue};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
