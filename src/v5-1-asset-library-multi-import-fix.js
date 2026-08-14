const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function boot(){
  let tries=0;
  while((!window.HangingMediaV51AssetLibrary||!document.querySelector('#v51al-upload'))&&tries++<120)await sleep(50);
  const api=window.HangingMediaV51AssetLibrary,input=document.querySelector('#v51al-upload');
  if(!api||!input)return;
  const original=api.importFiles.bind(api);
  async function importSelection(fileList){
    const files=[...fileList];
    const archives=files.filter(f=>/\.(zip|glb)$/i.test(f.name));
    const loose=files.filter(f=>!/\.(zip|glb)$/i.test(f.name));
    const groups=archives.map(f=>[f]);
    if(loose.length)groups.push(loose);
    if(!groups.length)return;
    for(let i=0;i<groups.length;i++){
      await original(groups[i]);
      await sleep(120);
    }
  }
  api.importFiles=importSelection;
  input.addEventListener('change',async e=>{
    if(!e.target.files?.length)return;
    e.stopImmediatePropagation();
    const files=[...e.target.files];
    try{await importSelection(files)}finally{e.target.value=''}
  },true);
  window.__V51_MULTI_IMPORT_FIX__={ready:true};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
