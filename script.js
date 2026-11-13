// UD. BILAL - script.js VERSI CROP + GESER
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, setDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhce1AyhPGe1cDkIzcBcgAFFOXC2Isxx0",
  authDomain: "toko-bilal.firebaseapp.com",
  projectId: "toko-bilal",
  storageBucket: "toko-bilal.firebasestorage.app",
  messagingSenderId: "507155195256",
  appId: "1:507155195256:web:39185c267b272b5672948d"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const ADMIN_UID = "spaWNW7l2YSqBvhC7hkK6Sd3d7A3";
const NOMOR_WA = "6281919194295";

let barangPublic = [];
let barangPrivate = {};
let barang = [];
let editId = null;
let currentPage = 1;
const perPage = 10;
let isLogin = false;
let kataCari = '';
let unsubPrivate = null;
window.FOTO_BARU = null;

// ===== CROP =====
let cropScale = 1, cropX = 0, cropY = 0, cropImgW = 0, cropImgH = 0, cropStartX = 0, cropStartY = 0, cropStartPX = 0, cropStartPY = 0, cropDragging = false, cropLastDist = 0;
let cropOriginal = null;

function updateCropTransform(){
  const img = document.getElementById('cropImg');
  if(!img) return;
  img.style.transform = `translate(-50%,-50%) translate(${cropX}px, ${cropY}px) scale(${cropScale})`;
  document.getElementById('zoomLabel').innerText = Math.round(cropScale*100) + '%';
}
window.aturZoom = (v) => { cropScale = Number(v)/100; updateCropTransform(); };

function bukaCrop(base64){
  cropOriginal = base64;
  cropScale = 1; cropX = 0; cropY = 0;
  const img = document.getElementById('cropImg');
  img.src = base64;
  img.onload = () => {
    const box = document.getElementById('cropBox');
    const bw = box.clientWidth, bh = box.clientHeight;
    const scaleFit = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
    cropImgW = img.naturalWidth * scaleFit;
    cropImgH = img.naturalHeight * scaleFit;
    img.style.width = cropImgW + 'px';
    img.style.height = cropImgH + 'px';
    updateCropTransform();
  };
  document.getElementById('zoomSlider').value = 100;
  document.getElementById('cropModal').classList.remove('hidden');
}
window.batalCrop = () => {
  document.getElementById('cropModal').classList.add('hidden');
  const inp = document.getElementById('fotoInput'); if(inp) inp.value='';
};
window.potongFoto = () => {
  const img = document.getElementById('cropImg');
  const box = document.getElementById('cropBox');
  const frameW = box.clientWidth * 0.92;
  const frameH = box.clientHeight * 0.82;
  const canvas = document.createElement('canvas');
  canvas.width = 800; canvas.height = Math.round(800 * frameH / frameW);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  // Hitung posisi crop di foto asli
  const dispW = cropImgW * cropScale;
  const dispH = cropImgH * cropScale;
  const imgLeft = box.clientWidth/2 + cropX - dispW/2;
  const imgTop = box.clientHeight/2 + cropY - dispH/2;
  const frameLeft = box.clientWidth/2 - frameW/2;
  const frameTop = box.clientHeight/2 - frameH/2;
  const sx = (frameLeft - imgLeft) / dispW * img.naturalWidth;
  const sy = (frameTop - imgTop) / dispH * img.naturalHeight;
  const sw = frameW / dispW * img.naturalWidth;
  const sh = frameH / dispH * img.naturalHeight;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const hasil = canvas.toDataURL('image/jpeg', 0.8);
  window.FOTO_BARU = hasil;
  const prev = document.getElementById('fotoPreview');
  if(prev){ prev.src = hasil; prev.classList.remove('hidden'); }
  const st = document.getElementById('fotoStatus');
  if(st) st.innerText = '✅ Foto udah di-crop, tinggal pencet UPDATE!';
  document.getElementById('cropModal').classList.add('hidden');
};

function olahFoto(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { bukaCrop(e.target.result); };
  reader.readAsDataURL(file);
}
window.previewFoto = function(input){ if(input.files[0]) olahFoto(input.files[0]); };
document.addEventListener('change', (e)=>{
  if(e.target && e.target.id === 'fotoInput'){
    if(e.target.files[0]) olahFoto(e.target.files[0]);
  }
});
// Geser + Cubit di Crop
document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('cropBox');
  if(!box) return;
  const mulai = (x,y) => { cropDragging=true; cropStartX=x; cropStartY=y; cropStartPX=cropX; cropStartPY=cropY; };
  const gerak = (x,y) => { if(!cropDragging) return; cropX = cropStartPX + (x-cropStartX); cropY = cropStartPY + (y-cropStartY); updateCropTransform(); };
  box.addEventListener('touchstart', (e)=>{
    if(e.touches.length===2){ cropLastDist = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); cropDragging=false; }
    else if(e.touches.length===1) mulai(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:true});
  box.addEventListener('touchmove', (e)=>{
    e.preventDefault();
    if(e.touches.length===2){
      let d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      if(cropLastDist>0){ cropScale = Math.min(3, Math.max(1, cropScale*(d/cropLastDist))); document.getElementById('zoomSlider').value = cropScale*100; updateCropTransform(); }
      cropLastDist=d;
    } else if(e.touches.length===1) gerak(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:false});
  box.addEventListener('touchend', ()=>{ cropDragging=false; cropLastDist=0; });
  box.addEventListener('mousedown', (e)=> mulai(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e)=> gerak(e.clientX, e.clientY));
  window.addEventListener('mouseup', ()=> cropDragging=false);
});
// ===== END CROP =====

function getTanggalHariIni() { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
function isHariIni(tgl) { if (!tgl) return false; return tgl === getTanggalHariIni(); }
function bersihKet(teks) { if (!teks) return ''; return teks.toString().replace(/^\s*\/\s*/, '').trim(); }
function aman(teks) { return String(teks ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function tampilStok(b) { let s = (b.stok ?? '').toString().trim(); if (!s) return '0'; return s; }
function gabungData() { barang = barangPublic.map(p => ({ ...p, modal: (barangPrivate[p.id] ? barangPrivate[p.id].modal : 0) })); render(); }

onSnapshot(query(collection(db, "barang_public"), orderBy("nama")), (snap) => {
  barangPublic = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  gabungData();
});
function mulaiDengarPrivate() {
  if (unsubPrivate) return;
  unsubPrivate = onSnapshot(query(collection(db, "barang_private")), (snap) => {
    barangPrivate = {};
    snap.docs.forEach(d => { barangPrivate[d.id] = d.data(); });
    gabungData();
  });
}
function stopDengarPrivate() { if (unsubPrivate) { unsubPrivate(); unsubPrivate = null; } barangPrivate = {}; gabungData(); }

onAuthStateChanged(auth, (user) => {
  isLogin = !!user && user.uid === ADMIN_UID;
  if (isLogin) mulaiDengarPrivate(); else stopDengarPrivate();
  updateUI(); render();
});
function updateUI() {
  document.getElementById('statusLogin').innerText = isLogin ? '✅ Login Admin - ' + (auth.currentUser ? auth.currentUser.email : '') : '🔒 Mode Lihat Saja';
  document.getElementById('statusLogin').className = isLogin ? 'text-sm font-bold text-green-600' : 'text-sm font-bold text-red-500';
  document.getElementById('btnLogin').innerText = isLogin ? 'LOGOUT' : 'LOGIN';
  let btnTambah = document.getElementById('btnTambah');
  if (btnTambah) { if (isLogin) btnTambah.classList.remove('hidden'); else btnTambah.classList.add('hidden'); }
}
window.toggleLogin = async () => {
  if (isLogin) { await signOut(auth); alert("Berhasil Logout"); return; }
  document.getElementById('boxLogin').classList.toggle('hidden');
};
window.doLogin = async () => {
  let email = document.getElementById('inputEmail').value.trim();
  let pass = document.getElementById('inputPass').value;
  if (!email || !pass) return alert("Isi Email & Password dulu!");
  try {
    let hasil = await signInWithEmailAndPassword(auth, email, pass);
    if (hasil.user.uid !== ADMIN_UID) { await signOut(auth); return alert("Akun ini bukan Admin UD. BILAL!"); }
    document.getElementById('boxLogin').classList.add('hidden');
    document.getElementById('inputPass').value = '';
    alert('Login Berhasil!');
  } catch (e) { alert('Gagal Login!'); }
};
window.bukaForm = () => {
  if (!isLogin) return alert("Harus Login dulu!");
  document.getElementById('judulForm').innerText = editId ? 'Edit Barang' : 'Tambah Barang';
  document.getElementById('popupForm').classList.remove('hidden');
};
window.tutupForm = () => { document.getElementById('popupForm').classList.add('hidden'); };
window.cariBarang = (teks) => { kataCari = teks.toLowerCase().trim(); currentPage = 1; render(); };

window.bukaZoomFoto = (id) => {
  const b = barang.find(x => x.id === id);
  if(!b || !b.foto) return;
  let modal = document.getElementById('modalZoomFoto');
  if(modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'modalZoomFoto';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:100;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<img id="imgZoom" src="${b.foto}" style="max-width:95%;max-height:90%;touch-action:none;"><button onclick="document.getElementById('modalZoomFoto').remove()" style="position:absolute;top:15px;right:15px;background:white;width:36px;height:36px;border-radius:50%;font-weight:bold;">✕</button>`;
  modal.addEventListener('click', (e)=>{ if(e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  const img = document.getElementById('imgZoom');
  let scale=1, lastDist=0, posX=0, posY=0, lastX=0, lastY=0;
  modal.addEventListener('touchstart', (e)=>{
    if(e.touches.length===2) lastDist = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    else if(e.touches.length===1){ lastX=e.touches[0].clientX; lastY=e.touches[0].clientY; }
  });
  modal.addEventListener('touchmove', (e)=>{
    e.preventDefault();
    if(e.touches.length===2){
      let d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      if(lastDist>0) scale = Math.min(3, Math.max(1, scale*(d/lastDist)));
      lastDist=d;
    } else if(e.touches.length===1 && scale>1){
      posX += e.touches[0].clientX-lastX; posY += e.touches[0].clientY-lastY;
      lastX=e.touches[0].clientX; lastY=e.touches[0].clientY;
    }
    img.style.transform = `scale(${scale}) translate(${posX/scale}px, ${posY/scale}px)`;
  }, {passive:false});
};

function render() {
  updateUI();
  let totalUntung = 0;
  if (isLogin) {
    barang.forEach(b => {
      let j = b.jual || b.harga || 0;
      let stokAngka = parseFloat(String(b.stok ?? '').replace(',', '.')) || 0;
      totalUntung += (j - (b.modal || 0)) * stokAngka;
    });
  }
  let hasilCari = barang.filter(b => b.nama.toLowerCase().includes(kataCari) || (b.keterangan || '').toLowerCase().includes(kataCari));
  let totalPage = Math.max(1, Math.ceil(hasilCari.length / perPage));
  if (currentPage > totalPage) currentPage = totalPage;
  let list = hasilCari.slice((currentPage - 1) * perPage, currentPage * perPage);
  let html = '';
  list.forEach(b => {
    let j = b.jual || b.harga || 0;
    let modal = b.modal || 0;
    let u = j - modal;
    let ket = bersihKet(b.keterangan);
    let tgl = b.tanggalUpdate || '-';
    let badgeBaru = isHariIni(b.tanggalUpdate) ? `<span class="badge-baru">BARU</span>` : '';
    let tombolWA = `<div class="px-3 pb-3"><a href="https://wa.me/${NOMOR_WA}?text=${encodeURIComponent(`Halo UD. BILAL, saya mau pesan ${b.nama} - Rp ${Number(j).toLocaleString('id-ID')}`)}" target="_blank" class="block text-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl">💬 PESAN VIA WHATSAPP</a></div>`;
    let tombol = isLogin ? `<div class="flex gap-2 px-3 pb-3">
           <button onclick="editBarang('${b.id}')" class="flex-1 bg-green-500 text-white py-3 rounded-xl flex items-center justify-center">✏️</button>
           <button onclick="hapus('${b.id}')" class="flex-1 bg-red-500 text-white py-3 rounded-xl flex items-center justify-center">🗑️</button>
         </div>` : ``;
    let barisModal = isLogin ? `<div class="mx-3 my-2 bg-gray-100 rounded-xl px-3 py-2.5 flex justify-between items-center"><span>💵 Harga Modal</span><span class="font-bold">Rp ${Number(modal).toLocaleString('id-ID')}</span></div>` : '';
    let barisUntung = isLogin ? `<div class="mx-3 my-2 bg-gray-100 rounded-xl px-3 py-2.5 flex justify-between items-center"><span>↕️ Untung</span><span class="font-bold ${u >= 0 ? 'text-green-600' : 'text-red-600'}">Rp ${u.toLocaleString('id-ID')}</span></div>` : '';
    let barisTanggal = `<div class="px-3 pt-2"><span class="last-update">Terakhir Update: ${aman(tgl)}</span></div>`;
    let blokFoto = b.foto ? `<div class="px-3 pt-3"><img src="${b.foto}" onclick="bukaZoomFoto('${b.id}')" class="w-full h-44 object-cover rounded-xl cursor-pointer" style="background:#eee;" alt="${aman(b.nama)}"><p class="text-center text-xs text-gray-400 mt-1">Klik foto untuk zoom / cubit</p></div>` : `<div class="px-3 pt-3"><div class="w-full h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">Belum ada foto</div></div>`;
    html += `<div class="border-2 border-gray-300 rounded-xl overflow-hidden">
      <div class="flex justify-between items-center bg-blue-50 px-3 py-2 border-b-2 border-gray-300">
        <span class="font-bold text-lg">${aman(b.nama)} ${badgeBaru}</span>
        <span class="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">STOK: ${aman(tampilStok(b))}</span>
      </div>
      ${blokFoto}
      ${barisTanggal}
      ${barisModal}
      <div class="mx-3 my-2 bg-gray-100 rounded-xl px-3 py-2.5 flex justify-between items-center"><span>🏷️ Harga Jual</span><span class="font-bold">Rp ${Number(j).toLocaleString('id-ID')}</span></div>
      <div class="mx-3 my-2 bg-gray-100 rounded-xl px-3 py-2.5 flex justify-between items-center"><span>ℹ️ Keterangan</span><span class="font-bold">${ket ? aman(ket) : '-'}</span></div>
      ${barisUntung}
      ${tombolWA}
      ${tombol}
    </div>`;
  });
  if (hasilCari.length === 0) html = `<p class="text-center text-gray-400 py-4">Barang gak ketemu, coba kata lain</p>`;
  document.getElementById('tabel').innerHTML = html;
  document.getElementById('infoPage').innerText = `Page ${currentPage} / ${totalPage} (Total ${hasilCari.length} barang)`;
  document.querySelector('.footer').innerHTML = isLogin ? `Total Jenis Produk: ${barang.length} | Total Untung: Rp ${totalUntung.toLocaleString('id-ID')}` : `Total Jenis Produk: ${barang.length}`;
}

window.gantiPage = (n) => {
  let tp = Math.max(1, Math.ceil(barang.length / perPage));
  currentPage += n; if (currentPage < 1) currentPage = 1; if (currentPage > tp) currentPage = tp;
  render(); window.scrollTo(0, 0);
};

window.simpan = async () => {
  if (!isLogin) return alert("Harus Login dulu!");
  let nama = document.getElementById('nama').value.trim();
  let modal = Number(document.getElementById('modal').value);
  let jual = Number(document.getElementById('harga').value);
  let keterangan = bersihKet(document.getElementById('keterangan').value);
  let stok = document.getElementById('stok').value.trim();
  if (!nama || !modal || !jual || !stok) return alert("Isi dulu!");
  let tanggalUpdate = getTanggalHariIni();
  let fotoBaru = window.FOTO_BARU || null;
  try {
    if (editId) {
      let dataPublic = { nama, jual, harga: jual, keterangan, stok, tanggalUpdate };
      if (fotoBaru) dataPublic.foto = fotoBaru;
      else {
        let lama = barang.find(x => x.id === editId);
        if(lama && lama.foto) dataPublic.foto = lama.foto;
      }
      await setDoc(doc(db, "barang_public", editId), dataPublic);
      await setDoc(doc(db, "barang_private", editId), { modal });
      editId = null; document.getElementById('btnSimpan').innerText = "SIMPAN";
    } else {
      let dataBaru = { nama, jual, harga: jual, keterangan, stok, tanggalUpdate };
      if (fotoBaru) dataBaru.foto = fotoBaru;
      let refBaru = await addDoc(collection(db, "barang_public"), dataBaru);
      await setDoc(doc(db, "barang_private", refBaru.id), { modal });
    }
    window.FOTO_BARU = null;
    const prev = document.getElementById('fotoPreview'); if(prev){ prev.src=''; prev.classList.add('hidden'); }
    const inpFoto = document.getElementById('fotoInput'); if(inpFoto) inpFoto.value='';
    const st = document.getElementById('fotoStatus'); if(st) st.innerText='';
    document.getElementById('nama').value = ''; document.getElementById('modal').value = ''; document.getElementById('harga').value = ''; document.getElementById('keterangan').value = ''; document.getElementById('stok').value = '';
    document.getElementById('popupForm').classList.add('hidden');
    alert('✅ Berhasil disimpan!');
  } catch (e) { alert("Gagal simpan! Foto mungkin kegedean, coba foto lain yang lebih kecil. " + e.message); }
};

window.editBarang = (id) => {
  if (!isLogin) return alert("Harus Login dulu!");
  let b = barang.find(x => x.id === id);
  if (!b) return alert("Barang gak ketemu, refresh dulu!");
  document.getElementById('nama').value = b.nama;
  document.getElementById('modal').value = b.modal || '';
  document.getElementById('harga').value = b.jual || b.harga;
  document.getElementById('keterangan').value = bersihKet(b.keterangan);
  document.getElementById('stok').value = b.stok;
  window.FOTO_BARU = null;
  const prev = document.getElementById('fotoPreview');
  const st = document.getElementById('fotoStatus');
  if(prev){ if(b.foto){ prev.src=b.foto; prev.classList.remove('hidden'); if(st) st.innerText='Foto lama masih ada. Pilih foto baru kalau mau ganti.'; } else { prev.src=''; prev.classList.add('hidden'); if(st) st.innerText='Belum ada foto, silahkan pilih foto.'; } }
  const inpFoto = document.getElementById('fotoInput'); if(inpFoto) inpFoto.value='';
  editId = id; document.getElementById('btnSimpan').innerText = "UPDATE";
  document.getElementById('judulForm').innerText = 'Edit Barang';
  document.getElementById('popupForm').classList.remove('hidden');
};
window.hapus = async (id) => {
  if (!isLogin) return alert("Harus Login dulu!");
  if (confirm("Hapus?")) { await deleteDoc(doc(db, "barang_public", id)); await deleteDoc(doc(db, "barang_private", id)); }
};
window.batalEdit = () => {
  editId = null; window.FOTO_BARU = null;
  const prev = document.getElementById('fotoPreview'); if(prev){ prev.src=''; prev.classList.add('hidden'); }
  const inpFoto = document.getElementById('fotoInput'); if(inpFoto) inpFoto.value='';
  const st = document.getElementById('fotoStatus'); if(st) st.innerText='';
  document.getElementById('nama').value = ''; document.getElementById('modal').value = ''; document.getElementById('harga').value = ''; document.getElementById('keterangan').value = ''; document.getElementById('stok').value = '';
  document.getElementById('btnSimpan').innerText = "SIMPAN";
  document.getElementById('popupForm').classList.add('hidden');
};
