// UD BILAL — Foto Drive v129. Tanpa API key server atau kredensial di file ini.
const DRIVE_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyCDX2gpPljtgIZAeMlhxCoiKOKsS3qQZeWMeDP8-at6_fkMn8-_Yo45j8qpQpvBVn_/exec';
let bridge=null;
function randomId(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');}
function googleOrigin(origin){return /^https:\/\/(?:[a-z0-9-]+\.)?script\.googleusercontent\.com$/.test(origin)||/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(origin)||origin==='https://script.google.com';}
function connectBridge(){
  const url=DRIVE_ENDPOINT;
  if(bridge&&bridge.url===url)return bridge.promise;
  if(bridge)bridge.dispose();
  const nonce=randomId(),frame=document.createElement('iframe');
  frame.title='Penghubung Google Drive';frame.style.cssText='position:absolute;width:1px;height:1px;border:0;left:-100px;';frame.setAttribute('aria-hidden','true');
  const state={url,nonce,frame,pending:new Map(),source:null,origin:null,listener:null,timer:null};
  state.promise=new Promise((resolve,reject)=>{
    state.timer=setTimeout(()=>{state.dispose();reject(Error('Penghubung belum merespons. Perbarui Code.gs lalu Deploy versi baru pada URL yang sama. Pastikan akses Siapa saja.'));},30000);
    state.listener=event=>{
      const m=event.data;
      if(!m||m.channel!=='bilal-drive-v2'||m.nonce!==nonce||!googleOrigin(event.origin))return;
      if(m.ready&&!state.source){state.source=event.source;state.origin=event.origin;clearTimeout(state.timer);resolve(state);return;}
      if(event.source!==state.source||event.origin!==state.origin)return;
      const pending=state.pending.get(m.id);if(!pending)return;
      state.pending.delete(m.id);clearTimeout(pending.timer);
      if(m.error)pending.reject(Error(m.error));else pending.resolve(m.data);
    };
    window.addEventListener('message',state.listener);
  });
  state.dispose=()=>{clearTimeout(state.timer);window.removeEventListener('message',state.listener);frame.remove();for(const pending of state.pending.values()){clearTimeout(pending.timer);pending.reject(Error('Sambungan diganti. Coba lagi.'));}state.pending.clear();if(bridge===state)bridge=null;};
  bridge=state;frame.src=url+'?bridge=1&nonce='+nonce;document.body.appendChild(frame);return state.promise;
}
async function driveRequest(action,payload){
  const state=await connectBridge();
  return new Promise((resolve,reject)=>{
    const id=randomId();const timer=setTimeout(()=>{state.pending.delete(id);reject(Error('Respons Apps Script terlalu lama. Jika sedang upload, periksa folder Drive sebelum mencoba ulang.'));},60000);
    state.pending.set(id,{resolve,reject,timer});
    state.source.postMessage({channel:'bilal-drive-v2',nonce:state.nonce,id,action,payload},state.origin);
  });
}

export function validDriveId(id){return typeof id === 'string' && /^[\w-]{10,200}$/.test(id);}
export async function uploadDrive(dataUrl,idToken){
  if(typeof dataUrl!=='string'||!/^data:image\/jpeg;base64,/.test(dataUrl)) throw Error('Format foto harus JPEG. Pilih dan potong foto lagi.');
  const base64=dataUrl.split(',')[1];
  if(base64.length>273068 || atob(base64).length>200*1024) throw Error('Foto melebihi 200 KB. Pilih foto lain.');
  const result=await driveRequest('upload',{idToken,base64});
  if(!result?.ok||!validDriveId(result.id))throw Error(result?.error||'Upload Drive gagal. Produk belum disimpan.');
  return result.id;
}
const photos=new Map(),queue=[];let running=0;
function pump(){
  while(running<3&&queue.length){const job=queue.shift();running++;job().finally(()=>{running--;pump();});}
}
export function readDrive(id){
  if(!validDriveId(id))return Promise.reject(Error('ID foto Drive tidak valid.'));
  if(photos.has(id)){const cached=photos.get(id);photos.delete(id);photos.set(id,cached);return cached;}
  const promise=new Promise((resolve,reject)=>{queue.push(async()=>{
    try{
      const result=await driveRequest('photo',{id});
      if(!result?.ok)throw Error(result?.error||'Foto belum dapat dimuat.');
      if(typeof result.base64!=='string'||result.base64.length>273068||!/^[/+A-Za-z0-9]+={0,2}$/.test(result.base64))throw Error('Balasan foto tidak valid.');
      resolve('data:image/jpeg;base64,'+result.base64);
    }catch(error){photos.delete(id);reject(error);}
  });pump();});
  photos.set(id,promise);
  if(photos.size>48)photos.delete(photos.keys().next().value);
  return promise;
}
export async function verifyDrive(id){
  const url=await readDrive(id);
  const image=new Image();image.src=url;
  await image.decode();
  if(!image.naturalWidth)throw Error('Foto Drive belum dapat dibaca. Produk belum disimpan.');
  return url;
}
