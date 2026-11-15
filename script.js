// UD. BILAL - script.js v122 - Perbaikan Koneksi Login
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

const MAX_PERCOBAAN_LOGIN = 5;
const WAKTU_KUNCI_MENIT = 5;

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
const IS_ADMIN_PAGE = window.location.pathname.includes('admin');
let sudahRenderPertama = false;
let lastDataHash = '';
let app = null, db = null, auth = null;
let fb = {};
let fbAuth = {};
let fbInitPromise = null;

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
    app = initializeApp(firebaseConfig);
    db = fs.getFirestore(app);
    fb = {
      collection: fs.collection, addDoc: fs.addDoc, deleteDoc: fs.deleteDoc,
      doc: fs.doc, setDoc: fs.setDoc, onSnapshot: fs.onSnapshot, query: fs.query, orderBy: fs.orderBy
    };
    if (IS_ADMIN_PAGE) {
      const fa = mods[2];
      auth = fa.getAuth(app);
      fbAuth = { signInWithEmailAndPassword: fa.signInWithEmailAndPassword, signOut: fa.signOut, onAuthStateChanged: fa.onAuthStateChanged };
      
      fbAuth.onAuthStateChanged(auth, (user) => {
        if (user && user.uid === ADMIN_UID) {
          isLogin = true;
          mulaiDengarPrivate();
          if (window.tampilkanKontenAdmin) window.tampilkanKontenAdmin(true);
          updateUI();
          render();
        }
      });
    }
  })();
  return fbInitPromise;
}

function el(id){ return document.getElementById(id); }

function toast(pesan){
  let t = document.getElementById('toastBilal');
  if(!t){ t = document.createElement('div'); t.id = 'toastBilal'; t.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#16a34a;color:#fff;padding:12px 18px;border-radius:99px;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.3);max-width:90%;text-align:center;'; document.body.appendChild(t); }
  t.style.background = '#16a34a'; t.innerText = pesan; t.style.display = 'block';
  clearTimeout(t._timer); t._timer = setTimeout(()=>{ t.style.display='none'; }, 2500);
}

function toastError(pesan){
  let t = document.getElementById('toastBilal'); if(!t){ toast(pesan); return; }
  t.style.background = '#ef4444'; t.innerText = pesan; t.style.display = 'block';
  clearTimeout(t._timer); t._timer = setTimeout(()=>{ t.style.display='none'; t.style.background='#16a34a'; }, 3000);
}

function cekKunciLogin() {
  const kunciSampai = localStorage.getItem('kunciSampai');
  if (kunciSampai && Date.now() < parseInt(kunciSampai)) return true;
  if (kunciSampai && Date.now() >= parseInt(kunciSampai)) {
    localStorage.removeItem('kunciSampai');
    localStorage.removeItem('jumlahSalahLogin');
  }
  return false;
}

function tambahPercobaanSalah() {
  let jumlahSalah = parseInt(localStorage.getItem('jumlahSalahLogin') || 0) + 1;
  localStorage.setItem('jumlahSalahLogin', jumlahSalah);
  if (jumlahSalah >= MAX_PERCOBAAN_LOGIN) {
    localStorage.setItem('kunciSampai', Date.now() + (WAKTU_KUNCI_MENIT * 60 * 1000));
    return true;
  }
  return false;
}

function resetPercobaanLogin() {
  localStorage.removeItem('jumlahSalahLogin');
  localStorage.removeItem('kunciSampai');
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

window.aturZoom = (v) => { cropScale = Number(v)/100; if(cropScale<1) cropScale=1; if(cropScale>3) cropScale=3; updateCropTransform(); const sl=el('zoomSlider'); if(sl) sl.value=Math.round(cropScale*100); };
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
  const img = el('cropImg'); const box = el('cropBox'); if(!img||!box) return;
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
  const st = el('fotoStatus'); if(st) st.innerText = `✅ Foto dikompres jadi ${ukKB} KB`;
  const m=el('cropModal'); if(m) m.classList.add('hidden'); toast(`✅ Foto siap! ${ukKB} KB`);
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
  imgTemp.src = url;
}

window.previewFoto = function(input){ if(input.files[0]) olahFoto(input.files[0]); };

document.addEventListener('change', (e)=>{ if(e.target && e.target.id === 'fotoInput'){ if(e.target.files[0]) olahFoto(e.target.files[0]); } });

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
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

function mulaiDengarPublic() {
  if (!db) return;
  fb.onSnapshot(fb.query(fb.collection(db, "barang_public"), fb.orderBy("nama")), (snap) => {
    barangPublic = [];
    snap.docs.forEach(d => { barangPublic.push({ id: d.id, ...d.data() }); });
    try { localStorage.setItem('bilal_cache_public', JSON.stringify(barangPublic)); } catch(e){}
    gabungData();
  });
}

function mulaiDengarPrivate() {
  if (unsubPrivate || !db) return;
  unsubPrivate = fb.onSnapshot(fb.query(fb.collection(db, "barang_private")), (snap) => {
    barangPrivate = {}; snap.docs.forEach(d => { barangPrivate[d.id] = d.data(); });
    try { localStorage.setItem('bilal_cache_private', JSON.stringify(barangPrivate)); } catch(e){}
    gabungData();
  });
}

function updateUI() {
  const st = el('statusLogin'); 
  if(st){ 
    st.innerText = isLogin ? '✅ Halo Admin UD. BILAL' : '🔒 Mode Lihat Saja'; 
  }
  const bl = el('btnLogin'); 
  if(bl) bl.style.display = isLogin ? 'block' : 'none';
  const bt = el('btnTambah'); 
  if(bt){ if(isLogin) bt.classList.remove('hidden'); else bt.classList.add('hidden'); }
}

window.toggleLogin = async () => { 
  if (!IS_ADMIN_PAGE) return; 
  await initFirebase(); 
  if (isLogin) { 
    await fbAuth.signOut(auth); 
    isLogin = false;
    resetPercobaanLogin();
    toast('✅ Berhasil Logout'); 
    updateUI();
    render();
  } 
};

window.doLogin = async () => {
  await initFirebase();
  
  if (cekKunciLogin()) {
    const mSalah = el('pesanSalah');
    const mKunci = el('pesanKunci');
    if(mSalah) mSalah.style.display='none';
    if(mKunci) mKunci.style.display='block';
    return;
  }
  
  let email = '';
  let pass = '';
  
  const eg = el('gateEmail');
  const pg = el('gatePass');
  const ei = el('inputEmail');
  const pi = el('inputPass');
  
  if(eg && pg){ email = eg.value.trim(); pass = pg.value; }
  else if(ei && pi){ email = ei.value.trim(); pass = pi.value; }
  
  if (!email || !pass){ 
    toastError("⚠️ Isi Email & Password dulu!"); 
    return; 
  }
  
  try {
    let hasil = await fbAuth.signInWithEmailAndPassword(auth, email, pass);
    
    if (hasil.user.uid !== ADMIN_UID) {
      await fbAuth.signOut(auth);
      const terkunci = tambahPercobaanSalah();
      if(terkunci){
        const mSalah = el('pesanSalah');
        const mKunci = el('pesanKunci');
        if(mSalah) mSalah.style.display='none';
        if(mKunci) mKunci.style.display='block';
      } else {
        const sisa = MAX_PERCOBAAN_LOGIN - parseInt(localStorage.getItem('jumlahSalahLogin'));
        const mSalah = el('pesanSalah');
        const mKunci = el('pesanKunci');
        if(mKunci) mKunci.style.display='none';
        if(mSalah){ mSalah.style.display='block'; mSalah.innerText=`❌ Bukan akun Admin! Sisa percobaan: ${sisa}`; }
      }
      return;
    }
    
    resetPercobaanLogin();
    localStorage.setItem('emailAdminBilal', email);
    isLogin = true;
    toast('✅ Login Berhasil! Selamat datang Admin');
    mulaiDengarPrivate();
    if (window.tampilkanKontenAdmin) window.tampilkanKontenAdmin(true);
    updateUI();
    render();
    
  } catch (e) {
    const terkunci = tambahPercobaanSalah();
    if(terkunci){
      const mSalah = el('pesanSalah');
      const mKunci = el('pesanKunci');
      if(mSalah) mSalah.style.display='none';
      if(mKunci) mKunci.style.display='block';
    } else {
      const sisa = MAX_PERCOBAAN_LOGIN - parseInt(localStorage.getItem('jumlahSalahLogin'));
      const mSalah = el('pesanSalah');
      const mKunci = el('pesanKunci');
      if(mKunci) mKunci.style.display='none';
      if(mSalah){ mSalah.style.display='block'; mSalah.innerText=`❌ Login gagal! Sisa percobaan: ${sisa}`; }
    }
  }
};

window.bukaForm = () => { 
  if (!isLogin){ toastError("⚠️ Harus Login dulu!"); return; } 
  const j=el('judulForm'); if(j) j.innerText = editId ? 'Edit Barang' : 'Tambah Barang'; 
  const p=el('popupForm'); if(p) p.classList.remove('hidden'); 
};

window.tutupForm = () => { 
  const p=el('popupForm'); if(p) p.classList.add('hidden'); 
  editId = null; 
  window.FOTO_BARU = null;
  const pr = el('fotoPreview'); if(pr) pr.classList.add('hidden');
  const fs = el('fotoStatus'); if(fs) fs.innerText = '';
  el('nama').value=''; el('modal').value=''; el('harga').value=''; el('keterangan').value=''; el('stok').value='';
};

window.batalEdit = function(){ tutupForm(); };

let cariTimer = null;
window.cariBarang = (teks) => { clearTimeout(cariTimer); cariTimer = setTimeout(()=>{ kataCari = teks.toLowerCase().trim(); currentPage = 1; render(); }, 250); };

window.bukaZoomFoto = (id) => {
  const b = barang.find(x => x.id === id); if(!b || !b.foto) return;
  let modal = document.getElementById('modalZoomF
