// UD. BILAL - script.js v126 (Terintegrasi Google Drive Bridge)
const firebaseConfig = {
  apiKey: "AIzaSyAhce1AyhPGe1cDkIzcBcgAFFOXC2Isxx0",
  authDomain: "toko-bilal.firebaseapp.com",
  projectId: "toko-bilal",
  storageBucket: "toko-bilal.firebasestorage.app",
  messagingSenderId: "507155195256",
  appId: "1:507155195256:web:39185c267b272b5672948d"
};
const ADMIN_UID = "spaWNW7l2YSqBvhC7hkK6Sd3d7A3";
const NOMOR_WA = "6281919194295";

let barangPublic = [];
let barangPrivate = {};
let barang = [];
let editId = null;
let currentPage = 1;
const perPage = 12;
let isLogin = false;
let kataCari = '';
let unsubPrivate = null;
window.FOTO_BARU = null;
const IS_ADMIN_PAGE = !!document.getElementById('gateAdmin');
let sudahRenderPertama = false;
let loginBusy = false, writeBusy = false, privateReady = false;
const protectedElements = Array.from(document.querySelectorAll('.butuh-login'));

function bolehKelola(){ return IS_ADMIN_PAGE && isLogin && auth?.currentUser?.uid === ADMIN_UID; }
function pesanError(e){
  const code = e?.code || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) return 'Email atau password salah.';
  if (code === 'auth/too-many-requests') return 'Terlalu banyak percobaan. Coba lagi nanti.';
  if (code === 'auth/user-disabled') return 'Akun ini dinonaktifkan.';
  if (/network|unavailable/.test(code)) return 'Koneksi bermasalah. Periksa internet lalu coba lagi.';
  if (/permission-denied/.test(code)) return 'Akses database ditolak. Periksa UID admin dan Firestore Rules.';
  return 'Proses gagal. Silakan coba lagi.';
}
function fotoAman(value){
  const v = String(value || '').trim();
  return /^(https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(v) || /^(?:\.\.?\/)?[\w/-]+\.(?:png|jpe?g|webp|gif)$/i.test(v) ? v : '';
}
function aksi(nama, id){ return aman(nama + '(' + JSON.stringify(String(id)) + ')'); }

let app = null, db = null, auth = null;
let fb = {};
let fbAuth = {};
let fbInitPromise = null, firebaseStartPromise = null;

function initFirebase(){
  if (fbInitPromise) return fbInitPromise;
  fbInitPromise = (async () => {
    const mods = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
      IS_ADMIN_PAGE ? import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js") : Promise.resolve(null)
    ]);
    const { initializeApp } = mods[0];
    const fs = mods[1];
    app = mods[0].getApps().length ? mods[0].getApp() : initializeApp(firebaseConfig);
    db = fs.getFirestore(app);
    fb = {
      collection: fs.collection, addDoc: fs.addDoc, deleteDoc: fs.deleteDoc,
      writeBatch: fs.writeBatch, doc: fs.doc, setDoc: fs.setDoc, onSnapshot: fs.onSnapshot, query: fs.query, orderBy: fs.orderBy
    };
    if (IS_ADMIN_PAGE) {
      const fa = mods[2];
      auth = fa.getAuth(app);
      fbAuth = { signInWithEmailAndPassword: fa.signInWithEmailAndPassword, signOut: fa.signOut, onAuthStateChanged: fa.onAuthStateChanged };
    }
  })().catch(e => { fbInitPromise = null; throw e; });
  return fbInitPromise;
}

function el(id){ return document.getElementById(id); }
function toast(pesan){
  let t = document.getElementById('toastBilal');
  if(!t){ t = document.createElement('div'); t.id = 'toastBilal'; t.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#16a34a;color:#fff;padding:12px 18px;border-radius:99px;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.3);max-width:90%;text-align:center;'; document.body.appendChild(t); }
  t.style.background = '#16a34a'; t.innerText = pesan; t.style.display = 'block';
  clearTimeout(t._timer); t._timer = setTimeout(()=>{ t.style.display='none'; }, 2000);
}
function toastError(pesan){
  let t = document.getElementById('toastBilal'); if(!t){ toast(pesan); t = el('toastBilal'); }
  t.style.background = '#ef4444'; t.innerText = pesan; t.style.display = 'block';
  clearTimeout(t._timer); t._timer = setTimeout(()=>{ t.style.display='none'; t.style.background='#16a34a'; }, 2500);
}

// --- JEMBATAN BRIDGE GOOGLE DRIVE ---
let bridgeState = null;
function randomNonce() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), v => v.toString(16).padStart(2, '0')).join('');
}
function googleOrigin(origin) {
  return /^https:\/\/(?:[a-z0-9-]+\.)?script\.googleusercontent\.com$/.test(origin) ||
         /^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(origin) ||
         origin === 'https://script.google.com';
}
function getBridge() {
  const endpointUrl = 'https://script.google.com/macros/s/AKfycbyfbG44Rrch0R0bYbuEDOLe952lsL_hDAxg0PCpIrMx1AX5RW-gojnbhWOEWgOpq2cKbw/exec';
  
  if (bridgeState && bridgeState.url === endpointUrl) return bridgeState.promise;
  if (bridgeState && bridgeState.dispose) bridgeState.dispose();

  const nonce = randomNonce();
  let iframe = document.getElementById('driveBridge');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'driveBridge';
    iframe.style.cssText = 'position:absolute;width:1px;height:1px;border:0;left:-100px;';
    document.body.appendChild(iframe);
  }
  
  const state = {
    url: endpointUrl,
    nonce,
    iframe,
    pending: new Map(),
    source: null,
    origin: null,
    listener: null,
    timer: null
  };

  state.promise = new Promise((resolve, reject) => {
    state.timer = setTimeout(() => {
      state.dispose();
      reject(new Error('Penghubung Google Drive belum merespons.'));
    }, 30000);

    state.listener = event => {
      const m = event.data;
      if (!m || m.channel !== 'bilal-drive-v2' || m.nonce !== nonce || !googleOrigin(event.origin)) return;
      if (m.ready && !state.source) {
        state.source = event.source;
        state.origin = event.origin;
        clearTimeout(state.timer);
        resolve(state);
        return;
      }
      if (event.source !== state.source || event.origin !== state.origin) return;
      const pending = state.pending.get(m.id);
      if (!pending) return;
      state.pending.delete(m.id);
      clearTimeout(pending.timer);
      if (m.error) pending.reject(new Error(m.error));
      else pending.resolve(m.data);
    };
    window.addEventListener('message', state.listener);
  });

  state.dispose = () => {
    clearTimeout(state.timer);
    window.removeEventListener('message', state.listener);
    for (const p of state.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('Sambungan diganti.'));
    }
    state.pending.clear();
    if (bridgeState === state) bridgeState = null;
  };

  bridgeState = state;
  iframe.src = endpointUrl + '?bridge=1&nonce=' + nonce;
  return state.promise;
}

async function driveRequest(action, payload) {
  const state = await getBridge();
  return new Promise((resolve, reject) => {
    const id = randomNonce();
    const timer = setTimeout(() => {
      state.pending.delete(id);
      reject(new Error('Respons Apps Script terlalu lama.'));
    }, 60000);
    state.pending.set(id, { resolve, reject, timer });
    state.source.postMessage({ channel: 'bilal-drive-v2', nonce: state.nonce, id, action, payload }, state.origin);
  });
}

async function uploadFotoKeDrive(base64Data, idTokenAdmin) {
  const base64String = base64Data.split(',')[1] || base64Data;
  const result = await driveRequest('upload', {
    idToken: idTokenAdmin,
    base64: base64String
  });
  if (!result.ok) throw new Error(result.error || 'Gagal mengupload foto ke Google Drive.');
  return result.id;
}

let cropScale = 1, cropX = 0, cropY = 0, cropImgW = 0, cropImgH = 0;
let cropStartX = 0, cropStartY = 0, cropStartPX = 0, cropStartPY = 0, cropDragging = false, cropPointerId = null;

function clampCrop(){
  const box = el('cropBox'); if(!box) return;
  const dispW = cropImgW * cropScale; const dispH = cropImgH * cropScale;
  const frameW = box.clientWidth * 0.92; const frameH = box.clientHeight * 0.82;
  const maxX = Math.max(0, (dispW - frameW) / 2); const maxY = Math.max(0, (dispH - frameH) / 2);
  cropX = Math.max(-maxX, Math.min(maxX, cropX)); cropY = Math.max(-maxY, Math.min(maxY, cropY));
}
function updateCropTransform(){
  clampCrop(); const img = el('cropImg'); if(!img) return;
  img.style.transform = `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${cropScale})`;
  const lbl = el('zoomLabel'); if(lbl) lbl.innerText = Math.round(cropScale*100) + '%';
}
window.aturZoom = (v) => { cropScale = Number(v)/100; if(cropScale<1) cropScale=1; if(cropScale>3) cropScale=3; updateCropTransform(); const sl=el('zoomSlider'); if(sl && Number(sl.value)!==Math.round(cropScale*100)) sl.value=Math.round(cropScale*100); };
window.zoomTambah = () => { cropScale = Math.min(3, cropScale + 0.2); const sl=el('zoomSlider'); if(sl) sl.value=Math.round(cropScale*100); updateCropTransform(); };
window.zoomKurang = () => { cropScale = Math.max(1, cropScale - 0.2); const sl=el('zoomSlider'); if(sl) sl.value=Math.round(cropScale*100); updateCropTransform(); };
window.resetCrop = () => { cropScale=1; cropX=0; cropY=0; const sl=el('zoomSlider'); if(sl) sl.value=100; updateCropTransform(); };

function bukaCrop(base64){
  cropScale = 1; cropX = 0; cropY = 0; const img = el('cropImg'); if(!img) return; img.src = base64;
  img.onload = () => { const box = el('cropBox'); const scaleFit = Math.max(box.clientWidth / img.naturalWidth, box.clientHeight / img.naturalHeight); cropImgW = img.naturalWidth * scaleFit; cropImgH = img.naturalHeight * scaleFit; img.style.width = cropImgW + 'px'; img.style.height = cropImgH + 'px'; updateCropTransform(); };
  const sl = el('zoomSlider'); if(sl) sl.value = 100; const m=el('cropModal'); if(m) m.classList.remove('hidden');
}
window.batalCrop = () => { const m=el('cropModal'); if(m) m.classList.add('hidden'); const inp=el('fotoInput'); if(inp) inp.value=''; };
window.potongFoto = () => {
  const img = el('cropImg'); const box = el('cropBox'); if(!img||!box||!img.complete||!img.naturalWidth||!cropImgW) return;
  const frameW = box.clientWidth * 0.92; const frameH = box.clientHeight * 0.82;
  const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = Math.round(400 * frameH / frameW);
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  const dispW = cropImgW * cropScale; const dispH = cropImgH * cropScale;
  const imgLeft = box.clientWidth/2 + cropX - dispW/2; const imgTop = box.clientHeight/2 + cropY - dispH/2;
  const frameLeft = box.clientWidth/2 - frameW/2; const frameTop = box.clientHeight/2 - frameH/2;
  const sx = (frameLeft - imgLeft) / dispW * img.naturalWidth; const sy = (frameTop - imgTop) / dispH * img.naturalHeight;
  const sw = frameW / dispW * img.naturalWidth; const sh = frameH / dispH * img.naturalHeight;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  let hasil = canvas.toDataURL('image/webp', 0.78);
  if(!hasil.startsWith('data:image/webp')) hasil = canvas.toDataURL('image/jpeg', 0.72);
  let ukKB = Math.round(hasil.length / 1024);
  window.FOTO_BARU = hasil;
  const prev = el('fotoPreview'); if(prev){ prev.src = hasil; prev.classList.remove('hidden'); }
  const st = el('fotoStatus'); if(st) st.innerText = `✅ Foto otomatis dikompres jadi ${ukKB} KB, siap diupload ke Drive!`;
  const m=el('cropModal'); if(m) m.classList.add('hidden'); toast(`✅ Foto siap (${ukKB} KB)`);
};

function olahFoto(file){
  if(!file) return;
  const imgTemp = new Image();
  const url = URL.createObjectURL(file);
  imgTemp.onload = () => {
    const max = 1000; let w = imgTemp.naturalWidth, h = imgTemp.naturalHeight;
    if(w > max || h > max){ let r = Math.min(max/w, max/h); w = Math.round(w*r); h = Math.round(h*r); }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(imgTemp, 0, 0, w, h);
    URL.revokeObjectURL(url);
    bukaCrop(c.toDataURL('image/jpeg', 0.8));
  };
  imgTemp.onerror = () => { URL.revokeObjectURL(url); toastError('Foto tidak dapat dibaca.'); };
  imgTemp.src = url;
}
window.previewFoto = function(input){ if(input.files[0]) olahFoto(input.files[0]); };
document.addEventListener('change', (e)=>{ if(e.target && e.target.id === 'fotoInput'){ if(e.target.files[0]) olahFoto(e.target.files[0]); } });

document.addEventListener('DOMContentLoaded', () => {
  const box = el('cropBox'); if(!box) return;
  box.addEventListener('pointerdown', (e)=>{ cropDragging=true; cropPointerId=e.pointerId; cropStartX=e.clientX; cropStartY=e.clientY; cropStartPX=cropX; cropStartPY=cropY; box.setPointerCapture(e.pointerId); e.preventDefault(); });
  box.addEventListener('pointermove', (e)=>{ if(!cropDragging || e.pointerId!==cropPointerId) return; cropX=cropStartPX+(e.clientX-cropStartX); cropY=cropStartPY+(e.clientY-cropStartY); updateCropTransform(); e.preventDefault(); });
  const endDrag=(e)=>{ if(e.pointerId===cropPointerId){ cropDragging=false; cropPointerId=null; } };
  box.addEventListener('pointerup', endDrag); box.addEventListener('pointercancel', endDrag);
});

function getTanggalHariIni() { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
function isHariIni(tgl) { if (!tgl) return false; return tgl === getTanggalHariIni(); }
function bersihKet(teks) { if (!teks) return ''; return teks.toString().replace(/^\s*\/\s*/, '').trim(); }
function aman(teks) { return String(teks ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function tampilStok(b) { let s = (b.stok ?? '').toString().trim(); if (!s) return '0'; return s; }
function gabungData() { barang = barangPublic.map(p => ({ ...p, modal: (barangPrivate[p.id] ? barangPrivate[p.id].modal : 0) })); render(); }

function mulaiDengarPrivate() {
  if (unsubPrivate || !bolehKelola()) return;
  unsubPrivate = fb.onSnapshot(fb.query(fb.collection(db, "barang_private")), (snap) => {
    if (!bolehKelola()) return;
    privateReady = true;
    barangPrivate = {}; snap.docs.forEach(d => { barangPrivate[d.id] = d.data(); });
    gabungData();
  }, e => { unsubPrivate = null; privateReady = false; barangPrivate = {}; gabungData(); toastError(pesanError(e)); });
}

function updateUI() {
  protectedElements.forEach(node => node.classList.toggle('butuh-login', !isLogin));
  if (el('gateAdmin')) el('gateAdmin').style.display = isLogin ? 'none' : 'flex';
  const st = el('statusLogin'); if(st){ st.innerText = isLogin ? 'Halo Admin UD. BILAL' : '🔒 Mode Lihat Saja'; st.className = isLogin ? 'text-sm font-bold text-green-600' : 'text-sm font-bold text-red-500'; }
  const bl = el('btnLogin'); if(bl) bl.innerText = isLogin ? 'LOGOUT' : 'LOGIN';
  const bt = el('btnTambah'); if(bt){ if(isLogin) bt.classList.remove('hidden'); else bt.classList.add('hidden'); }
}

window.toggleLogin = async () => {
  if (!IS_ADMIN_PAGE || loginBusy || writeBusy) return;
  try { await initFirebase(); if (auth.currentUser) { await fbAuth.signOut(auth); toast('Berhasil Logout'); } else updateUI(); }
  catch(e){ toastError(pesanError(e)); }
};

window.doLogin = async (fromGate = false) => {
  if (!IS_ADMIN_PAGE || loginBusy) return;
  const emailField = el(fromGate ? 'gateEmail' : 'inputEmail');
  const passField = el(fromGate ? 'gatePass' : 'inputPass');
  const email = emailField?.value.trim(), pass = passField?.value;
  if (!email || !pass) { toastError('Isi Email & Password dulu!'); return; }
  loginBusy = true;
  const buttons = document.querySelectorAll('[data-login-submit]');
  buttons.forEach(b => { b.disabled = true; b.textContent = 'MEMPROSES...'; });
  try {
    await mulaiFirebase();
    const result = await fbAuth.signInWithEmailAndPassword(auth, email, pass);
    if (result.user.uid !== ADMIN_UID) { await fbAuth.signOut(auth); toastError('Akun ini bukan Admin!'); return; }
    if(el('boxLogin')) el('boxLogin').classList.add('hidden');
    toast('Login Berhasil!');
  } catch(e){ toastError(pesanError(e)); }
  finally {
    ['gatePass', 'inputPass'].forEach(id => { if(el(id)) el(id).value = ''; });
    loginBusy = false;
    buttons.forEach(b => { b.disabled = false; b.textContent = 'MASUK'; });
  }
};
window.gateMasuk = () => window.doLogin(true);
['gatePass','gateEmail','inputPass','inputEmail'].forEach(id => el(id)?.addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); window.doLogin(id.startsWith('gate')); }
}));

window.bukaForm = () => { if (!bolehKelola()){ toastError("Harus Login dulu!"); return; } if(writeBusy) return; window.batalEdit(); const j=el('judulForm'); if(j) j.innerText = editId ? 'Edit Barang' : 'Tambah Barang'; const p=el('popupForm'); if(p) p.classList.remove('hidden'); };
window.tutupForm = () => { if(!writeBusy) window.batalEdit(); };

let cariTimer = null;
window.cariBarang = (teks) => { clearTimeout(cariTimer); cariTimer = setTimeout(()=>{ kataCari = teks.toLowerCase().trim(); currentPage = 1; render(); }, 250); };

window.bukaZoomFoto = (id) => {
  const b = barang.find(x => x.id === id); if(!b || !b.foto) return;
  let modal = document.getElementById('modalZoomFoto'); if(modal) modal.remove();
  modal = document.createElement('div'); modal.id = 'modalZoomFoto'; modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:100;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<img src="${aman(fotoAman(b.foto))}" style="max-width:95%;max-height:90%;"><button onclick="document.getElementById('modalZoomFoto').remove()" style="position:absolute;top:15px;right:15px;background:white;width:36px;height:36px;border-radius:50%;font-weight:bold;">✕</button>`;
  modal.addEventListener('click', (e)=>{ if(e.target === modal) modal.remove(); }); document.body.appendChild(modal);
};

window.beliSekarang = (id) => {
  const b = barang.find(x => x.id === id); if(!b) return; let q = 1; let j = b.jual ?? b.harga ?? 0; let total = q * j;
  let pesan = `Halo UD. BILAL, saya mau pesan:\n- ${b.nama}\n- Jumlah: ${q}\n- Harga: Rp ${Number(j).toLocaleString('id-ID')} / pcs\n- Total: Rp ${Number(total).toLocaleString('id-ID')}`;
  window.open(`https://wa.me/${NOMOR_WA}?text=${encodeURIComponent(pesan)}`, '_blank');
};

function render() {
  sudahRenderPertama = true;
  updateUI();
  let totalUntung = 0;
  let stokMenipis = 0;
  barang.forEach(b => {
    let j = b.jual ?? b.harga ?? 0;
    let stokAngka = parseFloat(String(b.stok ?? '').replace(',', '.')) || 0;
    if (isLogin) totalUntung += (j - (b.modal || 0)) * stokAngka;
    if (stokAngka <= 5) stokMenipis++;
  });
  if (el('statTotalProduk')) el('statTotalProduk').innerText = barang.length;
  if (el('statTotalUntung')) el('statTotalUntung').innerText = 'Rp ' + totalUntung.toLocaleString('id-ID');
  if (el('statStokMenipis')) el('statStokMenipis').innerText = stokMenipis;

  let hasilCari = barang.filter(b => String(b.nama ?? '').toLowerCase().includes(kataCari) || String(b.keterangan ?? '').toLowerCase().includes(kataCari));
  let totalPage = Math.max(1, Math.ceil(hasilCari.length / perPage)); if (currentPage > totalPage) currentPage = totalPage;
  let list = hasilCari.slice((currentPage - 1) * perPage, currentPage * perPage); let html = '';
  list.forEach(b => {
    let j = b.jual ?? b.harga ?? 0; let modal = b.modal || 0; let u = j - modal; let ket = bersihKet(b.keterangan);
    let badgeBaru = isHariIni(b.tanggalUpdate) ? `<span class="badge-baru">BARU</span>` : '';
    let stokAngka = parseFloat(String(b.stok ?? '').replace(',', '.')) || 0;
    let foto = b.foto ? `<img loading="lazy" decoding="async" src="${aman(fotoAman(b.foto))}" onclick="${aksi('bukaZoomFoto', b.id)}" class="foto-produk cursor-pointer" alt="${aman(b.nama)}">` : `<div class="w-full flex items-center justify-center text-gray-400 text-xs" style="aspect-ratio:1/1;background:#f8f8f8;">Belum ada foto</div>`;
    let tombolWA = IS_ADMIN_PAGE ? '' : `<button onclick="${aksi('beliSekarang', b.id)}" class="w-full mt-2 py-2.5 rounded-lg font-bold text-white text-[13px]" style="background:#25D366;box-shadow:0 3px 10px rgba(37,211,102,.4);">💬 Pesan via WA</button>`;
    let isiKartu = `<div class="p-2 text-center flex-1 flex flex-col"><p class="font-bold text-[15px] leading-tight line-clamp-2 min-h-[38px]">${aman(b.nama)}</p><p class="text-gray-400 font-bold text-[14px] mt-1">Rp${Number(j).toLocaleString('id-ID')}</p><p class="text-[12px] text-gray-500 mt-1 min-h-[18px]">${ket ? aman(ket) : '-'}</p>${tombolWA}</div>`;
    let infoAdmin = '';
    if (IS_ADMIN_PAGE && isLogin) {
      infoAdmin = `<div class="info-admin-box"><div class="flex justify-between"><span style="color:#888;">Modal</span><b>Rp ${Number(modal).toLocaleString('id-ID')}</b></div><div class="flex justify-between mt-0.5"><span style="color:#888;">Untung</span><b class="${u>=0?'text-green-600':'text-red-600'}">Rp ${u.toLocaleString('id-ID')}</b></div><div class="mt-0.5"><div class="flex justify-between"><span style="color:#888;">Stok</span><b class="${stokAngka<=5?'text-red-600':''}">${stokAngka <= 5 ? '❗ ' : ''}${aman(tampilStok(b))}</b></div></div></div><div class="flex gap-2 px-2 pb-2 pt-1"><button onclick="${aksi('editBarang', b.id)}" class="btn-edit">✏️ Edit</button><button onclick="${aksi('hapus', b.id)}" class="btn-hapus">🗑️ Hapus</button></div>`;
    }
    html += `<div class="kartu"><div class="relative">${foto}<div class="absolute top-1 left-1">${badgeBaru}</div></div>${isiKartu}${infoAdmin}</div>`;
  });
  if (hasilCari.length === 0) html = `<p class="text-center text-gray-400 py-4 col-span-2">Barang gak ketemu, coba kata lain</p>`;
  const tabel = el('tabel'); if(tabel) tabel.innerHTML = html;
  const info = el('infoPage'); if(info) info.innerText = `Page ${currentPage} / ${totalPage} (Total ${hasilCari.length} barang)`;
  const foot = document.querySelector('.footer'); if(foot) foot.innerHTML = (IS_ADMIN_PAGE && isLogin) ? `Total Jenis Produk: ${barang.length} | Total Untung: Rp ${totalUntung.toLocaleString('id-ID')}` : `Total Jenis Produk: ${barang.length}`;
}

window.gantiPage = (n) => { let tp = Math.max(1, Math.ceil(barang.length / perPage)); currentPage += n; if (currentPage < 1) currentPage = 1; if (currentPage > tp) currentPage = tp; render(); window.scrollTo(0, 0); };

// --- FUNGSI SIMPAN DENGAN INTEGRASI GOOGLE DRIVE ---
window.simpan = async () => {
  if (!bolehKelola()){ toastError('Harus Login dulu!'); return; }
  if (writeBusy) return;
  if (!privateReady){ toastError('Data modal belum siap. Tunggu atau muat ulang halaman.'); return; }
  
  const nama = el('nama').value.trim(), modalText = el('modal').value.trim(), jualText = el('harga').value.trim();
  const modal = Number(modalText), jual = Number(jualText), stok = el('stok').value.trim();
  const keterangan = bersihKet(el('keterangan').value);
  
  if (!nama || !modalText || !jualText || !stok || !Number.isFinite(modal) || !Number.isFinite(jual) || modal < 0 || jual < 0){ 
    toastError('Lengkapi data. Harga harus angka nol atau lebih.'); 
    return; 
  }
  
  writeBusy = true;
  const button = el('btnSimpan'); 
  button.disabled = true; 
  button.innerText = 'MENYIMPAN...';

  try {
    let fotoUrlFinal = null;
    
    // Jika admin memilih foto baru, upload dulu ke Google Drive via Bridge
    if (window.FOTO_BARU) {
      button.innerText = 'UPLOADING FOTO KE DRIVE...';
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Sesi login admin kedaluwarsa.');
      
      const idTokenAdmin = await currentUser.getIdToken();
      const fotoId = await uploadFotoKeDrive(window.FOTO_BARU, idTokenAdmin);
      
      const endpointUrl = 'https://script.google.com/macros/s/AKfycbyfbG44Rrch0R0bYbuEDOLe952lsL_hDAxg0PCpIrMx1AX5RW-gojnbhWOEWgOpq2cKbw/exec';
      fotoUrlFinal = endpointUrl + '?photo=' + fotoId;
    }

    button.innerText = 'MENYIMPAN KE DATABASE...';
    const ref = editId ? fb.doc(db, 'barang_public', editId) : fb.doc(fb.collection(db, 'barang_public'));
    
    const data = { 
      nama, 
      jual, 
      harga: jual, 
      keterangan, 
      stok, 
      tanggalUpdate: getTanggalHariIni() 
    };
    
    if (fotoUrlFinal) {
      data.foto = fotoUrlFinal;
    }

    const batch = fb.writeBatch(db);
    batch.set(ref, data, { merge: true });
    batch.set(fb.doc(db, 'barang_private', ref.id), { modal }, { merge: true });
    await batch.commit();
    
    writeBusy = false; 
    window.batalEdit(); 
    toast('✅ Berhasil disimpan & foto masuk Drive!');
  } catch(e){ 
    toastError(e.message || pesanError(e)); 
  } finally { 
    writeBusy = false; 
    button.disabled = false; 
    button.innerText = editId ? 'UPDATE' : 'SIMPAN'; 
  }
};

window.editBarang = (id) => {
  if(writeBusy) return;
  if(!privateReady){ toastError('Data modal belum siap.'); return; }
  if (!bolehKelola()){ toastError("Harus Login dulu!"); return; } 
  let b = barang.find(x => x.id === id); if (!b){ toastError("Barang gak ketemu!"); return; }
  el('nama').value = b.nama; el('modal').value = b.modal ?? ''; el('harga').value = b.jual ?? b.harga ?? 0; el('keterangan').value = bersihKet(b.keterangan); el('stok').value = b.stok; window.FOTO_BARU = null;
  const prev = el('fotoPreview'); const st = el('fotoStatus'); 
  if(prev){ 
    if(b.foto){ prev.src=b.foto; prev.classList.remove('hidden'); if(st) st.innerText='Foto lama aktif. Pilih foto baru jika ingin mengganti.'; } 
    else { prev.src=''; prev.classList.add('hidden'); if(st) st.innerText='Belum ada foto.'; } 
  }
  const inpFoto = el('fotoInput'); if(inpFoto) inpFoto.value=''; editId = id; 
  if(el('btnSimpan')) el('btnSimpan').innerText = "UPDATE"; 
  if(el('judulForm')) el('judulForm').innerText = 'Edit Barang'; 
  const pf=el('popupForm'); if(pf) pf.classList.remove('hidden');
};

window.hapus = async (id) => {
  if(!bolehKelola()){ toastError('Harus Login dulu!'); return; }
  if(writeBusy || !confirm('Hapus barang ini?')) return;
  writeBusy = true;
  try {
    const batch = fb.writeBatch(db);
    batch.delete(fb.doc(db, 'barang_public', id));
    batch.delete(fb.doc(db, 'barang_private', id));
    await batch.commit(); toast('Barang dihapus');
  } catch(e){ toastError(pesanError(e)); }
  finally { writeBusy = false; }
};

window.batalEdit = () => { 
  if(writeBusy) return; 
  editId = null; 
  window.FOTO_BARU = null; 
  const prev = el('fotoPreview'); if(prev){ prev.src=''; prev.classList.add('hidden'); } 
  const inpFoto = el('fotoInput'); if(inpFoto) inpFoto.value=''; 
  const st = el('fotoStatus'); if(st) st.innerText=''; 
  if(el('nama')) el('nama').value=''; 
  if(el('modal')) el('modal').value=''; 
  if(el('harga')) el('harga').value=''; 
  if(el('keterangan')) el('keterangan').value=''; 
  if(el('stok')) el('stok').value=''; 
  if(el('btnSimpan')) el('btnSimpan').innerText = "SIMPAN"; 
  const pf=el('popupForm'); if(pf) pf.classList.add('hidden'); 
};

try {
  const cachePub = JSON.parse(localStorage.getItem('bilal_cache_public') || 'null');
  if (cachePub && Array.isArray(cachePub)) { barangPublic = cachePub; gabungData(); }
  localStorage.removeItem('bilal_cache_private');
} catch(e){}

function mulaiFirebase(){
  if(firebaseStartPromise) return firebaseStartPromise;
  firebaseStartPromise = initFirebase().then(() => {
    fb.onSnapshot(fb.query(fb.collection(db, "barang_public"), fb.orderBy("nama")), (snap) => {
      let baru = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      barangPublic = baru;
      try { localStorage.setItem('bilal_cache_public', JSON.stringify(baru)); } catch(e){}
      gabungData();
    }, e => toastError(pesanError(e)));
    if (IS_ADMIN_PAGE) {
      fbAuth.onAuthStateChanged(auth, (user) => {
        let loginBaru = !!user && user.uid === ADMIN_UID;
        isLogin = loginBaru;
        if (isLogin) mulaiDengarPrivate(); 
        else { 
          if(unsubPrivate){ unsubPrivate(); unsubPrivate=null; } 
          barangPrivate={}; privateReady=false; window.batalEdit(); 
          ['popupForm','cropModal','boxLogin'].forEach(id => el(id)?.classList.add('hidden')); 
          ['gatePass','inputPass'].forEach(id => { if(el(id)) el(id).value = ''; }); 
        }
        gabungData();
      });
    }
  }).catch(e => { firebaseStartPromise = null; updateUI(); throw e; });
  return firebaseStartPromise;
}

updateUI();
if ('requestIdleCallback' in window) requestIdleCallback(() => mulaiFirebase().catch(e => toastError(pesanError(e))), { timeout: 1500 });
else setTimeout(() => mulaiFirebase().catch(e => toastError(pesanError(e))), 0);
