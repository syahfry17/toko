// UD. BILAL - script.js v117 - RAPI
// v117: Hapus qty, Hapus STOK/TERSEDIA di pelanggan (cuma Admin), + Tombol X di pencarian
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
const IS_ADMIN_PAGE = window.location.pathname.includes('admin');
let sudahRenderPertama = false;
let lastDataHash = '';

// === Firebase lazy-load (tidak blokir tampilan pertama) ===
let app = null, db = null, auth = null;
let fb = {};
let fbAuth = {};
let fbInitPromise = null;

function initFirebase() {
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
    }
  })();
  return fbInitPromise;
}

function el(id) { return document.getElementById(id); }

function toast(pesan) {
  let t = document.getElementById('toastBilal');
  if (!t) {
    t = document.createElement('div'); t.id = 'toastBilal';
    t.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#16a34a;color:#fff;padding:12px 18px;border-radius:99px;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.3);max-width:90%;text-align:center;';
    document.body.appendChild(t);
  }
  t.style.background = '#16a34a'; t.innerText = pesan; t.style.display = 'block';
  clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.display = 'none'; }, 2000);
}

function toastError(pesan) {
  let t = document.getElementById('toastBilal'); if (!t) { toast(pesan); return; }
  t.style.background = '#ef4444'; t.innerText = pesan; t.style.display = 'block';
  clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.display = 'none'; t.style.background = '#16a34a'; }, 2500);
}

// === Crop Foto ===
let cropScale = 1, cropX = 0, cropY = 0, cropImgW = 0, cropImgH = 0;
let cropStartX = 0, cropStartY = 0, cropStartPX = 0, cropStartPY = 0, cropDragging = false, cropPointerId = null;

function clampCrop() {
  const box = el('cropBox'); if (!box) return;
  const dispW = cropImgW * cropScale; const dispH = cropImgH * cropScale;
  const frameW = box.clientWidth * 0.92; const frameH = box.clientHeight * 0.82;
  const maxX = Math.max(0, (dispW - frameW) / 2); const maxY = Math.max(0, (dispH - frameH) / 2);
  cropX = Math.max(-maxX, Math.min(maxX, cropX)); cropY = Math.max(-maxY, Math.min(maxY, cropY));
}

function updateCropTransform() {
  clampCrop(); const img = el('cropImg'); if (!img) return;
  img.style.transform = `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${cropScale})`;
  const lbl = el('zoomLabel'); if (lbl) lbl.innerText = Math.round(cropScale * 100) + '%';
}

window.aturZoom = (v) => { cropScale = Number(v) / 100; if (cropScale < 1) cropScale = 1; if (cropScale > 3) cropScale = 3; updateCropTransform(); const sl = el('zoomSlider'); if (sl && Number(sl.value) !== Math.round(cropScale * 100)) sl.value = Math.round(cropScale * 100); };
window.zoomTambah = () => { cropScale = Math.min(3, cropScale + 0.2); const sl = el('zoomSlider'); if (sl) sl.value = Math.round(cropScale * 100); updateCropTransform(); };
window.zoomKurang = () => { cropScale = Math.max(1, cropScale - 0.2); const sl = el('zoomSlider'); if (sl) sl.value = Math.round(cropScale * 100); updateCropTransform(); };
window.resetCrop = () => { cropScale = 1; cropX = 0; cropY = 0; const sl = el('zoomSlider'); if (sl) sl.value = 100; updateCropTransform(); };

function bukaCrop(base64) {
  cropScale = 1; cropX = 0; cropY = 0; const img = el('cropImg'); if (!img) return; img.src = base64;
  img.onload = () => {
    const box = el('cropBox');
    const scaleFit = Math.max(box.clientWidth / img.naturalWidth, box.clientHeight / img.naturalHeight);
    cropImgW = img.naturalWidth * scaleFit; cropImgH = img.naturalHeight * scaleFit;
    img.style.width = cropImgW + 'px'; img.style.height = cropImgH + 'px'; updateCropTransform();
  };
  const sl = el('zoomSlider'); if (sl) sl.value = 100; const m = el('cropModal'); if (m) m.classList.remove('hidden');
}

window.batalCrop = () => { const m = el('cropModal'); if (m) m.classList.add('hidden'); const inp = el('fotoInput'); if (inp) inp.value = ''; };

window.potongFoto = () => {
  const img = el('cropImg'); const box = el('cropBox'); if (!img || !box) return;
  const frameW = box.clientWidth * 0.92; const frameH = box.clientHeight * 0.82;
  const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = Math.round(400 * frameH / frameW);
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const dispW = cropImgW * cropScale; const dispH = cropImgH * cropScale;
  const imgLeft = box.clientWidth / 2 + cropX - dispW / 2; const imgTop = box.clientHeight / 2 + cropY - dispH / 2;
  const frameLeft = box.clientWidth / 2 - frameW / 2; const frameTop = box.clientHeight / 2 - frameH / 2;
  const sx = (frameLeft - imgLeft) / dispW * img.naturalWidth; const sy = (frameTop - imgTop) / dispH * img.naturalHeight;
  const sw = frameW / dispW * img.naturalWidth; const sh = frameH / dispH * img.naturalHeight;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  let hasil = canvas.toDataURL('image/webp', 0.78);
  if (!hasil.startsWith('data:image/webp')) hasil = canvas.toDataURL('image/jpeg', 0.72);
  let ukKB = Math.round(hasil.length / 1024);
  window.FOTO_BARU = hasil;
  const prev = el('fotoPreview'); if (prev) { prev.src = hasil; prev.classList.remove('hidden'); }
  const st = el('fotoStatus'); if (st) st.innerText = `✅ Foto otomatis dikompres jadi ${ukKB} KB (WebP), tinggal pencet UPDATE / SIMPAN!`;
  const m = el('cropModal'); if (m) m.classList.add('hidden'); toast(`✅ Foto dikecilin jadi ${ukKB} KB, website tetap ngebut!`);
};

function olahFoto(file) {
  if (!file) return;
  const imgTemp = new Image();
  const url = URL.createObjectURL(file);
  imgTemp.onload = () => {
    const max = 1000; let w = imgTemp.naturalWidth, h = imgTemp.naturalHeight;
    if (w > max || h > max) { let r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(imgTemp, 0, 0, w, h);
    URL.revokeObjectURL(url);
    bukaCrop(c.toDataURL('image/jpeg', 0.8));
  };
  imgTemp.src = url;
}

window.previewFoto = function (input) { if (input.files[0]) olahFoto(input.files[0]); };
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'fotoInput') { if (e.target.files[0]) olahFoto(e.target.files[0]); } });

document.addEventListener('DOMContentLoaded', () => {
  const box = el('cropBox'); if (!box) return;
  box.addEventListener('pointerdown', (e) => { cropDragging = true; cropPointerId = e.pointerId; cropStartX = e.clientX; cropStartY = e.clientY; cropStartPX = cropX; cropStartPY = cropY; box.setPointerCapture(e.pointerId); e.preventDefault(); });
  box.addEventListener('pointermove', (e) => { if (!cropDragging || e.pointerId !== cropPointerId) return; cropX = cropStartPX + (e.clientX - cropStartX); cropY = cropStartPY + (e.clientY - cropStartY); updateCropTransform(); e.preventDefault(); });
  const endDrag = (e) => { if (e.pointerId === cropPointerId) { cropDragging = false; cropPointerId = null; } };
  box.addEventListener('pointerup', endDrag); box.addEventListener('pointercancel', endDrag);
});

function getTanggalHariIni() { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
function isHariIni(tgl) { if (!tgl) return false; return tgl === getTanggalHariIni(); }
function bersihKet(teks) { if (!teks) return ''; return teks.toString().replace(/^\s*\/\s*/, '').trim(); }
function aman(teks) { return String(teks ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function tampilStok(b) { let s = (b.stok ?? '').toString().trim(); if (!s) return '0'; return s; }

function gabungData() {
  barang = barangPublic.map(p => ({ ...p, modal: (barangPrivate[p.id] ? barangPrivate[p.id].modal : 0) }));
  render();
}

function mulaiDengarPrivate() {
  if (unsubPrivate) return;
  unsubPrivate = fb.onSnapshot(fb.query(fb.collection(db, "barang_private")), (snap) => {
    barangPrivate = {}; snap.docs.forEach(d => { barangPrivate[d.id] = d.data(); });
    try { localStorage.setItem('bilal_cache_private', JSON.stringify(barangPrivate)); } catch (e) { }
    gabungData();
  });
}

function updateUI() {
  const st = el('statusLogin'); if (st) { st.innerText = isLogin ? 'Halo Admin UD. BILAL' : '🔒 Mode Lihat Saja'; st.className = isLogin ? 'text-sm font-bold text-green-600' : 'text-sm font-bold text-red-500'; }
  const bl = el('btnLogin'); if (bl) bl.innerText = isLogin ? 'LOGOUT' : 'LOGIN';
  const bt = el('btnTambah'); if (bt) { if (isLogin) bt.classList.remove('hidden'); else bt.classList.add('hidden'); }
  const saved = localStorage.getItem('emailAdminBilal'); const inpE = el('inputEmail'); if (inpE && saved) inpE.value = saved;
}

window.toggleLogin = async () => {
  if (!IS_ADMIN_PAGE) return; await initFirebase();
  if (isLogin) { await fbAuth.signOut(auth); toast('Berhasil Logout'); return; }
  const b = el('boxLogin'); if (b) b.classList.toggle('hidden');
};

window.doLogin = async () => {
  await initFirebase();
  let email = el('inputEmail') ? el('inputEmail').value.trim() : ''; let pass = el('inputPass') ? el('inputPass').value : '';
  if (!email || !pass) { toastError("Isi Email & Password dulu!"); return; }
  try {
    let hasil = await fbAuth.signInWithEmailAndPassword(auth, email, pass);
    if (hasil.user.uid !== ADMIN_UID) { await fbAuth.signOut(auth); toastError("Akun ini bukan Admin!"); return; }
    const b = el('boxLogin'); if (b) b.classList.add('hidden');
    if (el('inputPass')) el('inputPass').value = ''; toast('Login Berhasil!');
  } catch (e) { toastError('Gagal Login!'); }
};

window.bukaForm = () => { if (!isLogin) { toastError("Harus Login dulu!"); return; } const j = el('judulForm'); if (j) j.innerText = editId ? 'Edit Barang' : 'Tambah Barang'; const p = el('popupForm'); if (p) p.classList.remove('hidden'); };
window.tutupForm = () => { const p = el('popupForm'); if (p) p.classList.add('hidden'); };

let cariTimer = null;
window.cariBarang = (teks) => { clearTimeout(cariTimer); cariTimer = setTimeout(() => { kataCari = teks.toLowerCase().trim(); currentPage = 1; render(); }, 250); };

// === Tombol X di pencarian - hapus teks, balik ke semua barang ===
window.hapusCari = () => {
  const inp = document.querySelector('input[oninput*="cariBarang"]') || el('inputCari') || document.querySelector('input[placeholder*="Cari"]');
  if (inp) inp.value = '';
  kataCari = ''; currentPage = 1; render();
  const btnX = el('btnClearCari'); if (btnX) btnX.style.display = 'none';
  if (inp) inp.focus();
};

window.bukaZoomFoto = (id) => {
  const b = barang.find(x => x.id === id); if (!b || !b.foto) return;
  let modal = document.getElementById('modalZoomFoto'); if (modal) modal.remove();
  modal = document.createElement('div'); modal.id = 'modalZoomFoto';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:100;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<img src="${b.foto}" style="max-width:95%;max-height:90%;"><button onclick="document.getElementById('modalZoomFoto').remove()" style="position:absolute;top:15px;right:15px;background:white;width:36px;height:36px;border-radius:50%;font-weight:bold;">✕</button>`;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); }); document.body.appendChild(modal);
};

// === BELI: jumlah selalu 1, pelanggan atur jumlah di WA ===
window.beliSekarang = (id) => {
  const b = barang.find(x => x.id === id); if (!b) return;
  let q = 1;
  let j = b.jual || b.harga || 0;
  let total = q * j;
  let pesan = `Halo UD. BILAL, saya mau pesan:\n- ${b.nama}\n- Jumlah: ${q}\n- Harga: Rp ${Number(j).toLocaleString('id-ID')} / pcs\n- Total: Rp ${Number(total).toLocaleString('id-ID')}`;
  window.open(`https://wa.me/${NOMOR_WA}?text=${encodeURIComponent(pesan)}`, '_blank');
};

function render() {
  sudahRenderPertama = true;
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
    let badgeBaru = isHariIni(b.tanggalUpdate) ? `<span class="badge-baru">BARU</span>` : '';
    let foto = b.foto
      ? `<img loading="lazy" decoding="async" src="${b.foto}" onclick="bukaZoomFoto('${b.id}')" class="foto-produk cursor-pointer" alt="${aman(b.nama)}">`
      : `<div class="w-full flex items-center justify-center text-gray-400 text-xs" style="aspect-ratio:1/1;background:#f8f8f8;">Belum ada foto</div>`;

    let isiKartu = `
      <div class="p-2 text-center flex-1 flex flex-col">
        <p class="font-bold text-[15px] leading-tight line-clamp-2 min-h-[38px]">${aman(b.nama)}</p>
        <p class="text-gray-400 font-bold text-[14px] mt-1">Rp${Number(j).toLocaleString('id-ID')}</p>
        <p class="text-[12px] text-gray-500 mt-1 min-h-[18px]">${ket ? aman(ket) : '-'}</p>
        <button onclick="beliSekarang('${b.id}')" class="w-full mt-2 py-2.5 rounded-lg font-bold text-white text-[13px]" style="background:#7cb342;">💬 Pesan via WA</button>
        ${IS_ADMIN_PAGE ? '<p class="last-update mt-1">Update 23 Nov 2026</p>' : ''}
      </div>`;

    let infoAdmin = '';
    if (IS_ADMIN_PAGE) {
      infoAdmin = `
        <div class="px-2 pb-1 text-[11px] text-gray-500 space-y-0.5 border-t pt-1">
          <div class="flex justify-between"><span>Modal</span><b>Rp ${Number(modal).toLocaleString('id-ID')}</b></div>
          <div class="flex justify-between"><span>Untung</span><b class="${u >= 0 ? 'text-green-600' : 'text-red-600'}">Rp ${u.toLocaleString('id-ID')}</b></div>
          <div class="flex justify-between"><span>Stok</span><b>STOK: ${aman(tampilStok(b))}</b></div>
        </div>
        <div class="flex gap-1 px-2 pb-2">
          <button onclick="editBarang('${b.id}')" class="flex-1 bg-yellow-400 text-white py-1.5 rounded-lg text-xs font-bold">✏️ Edit</button>
          <button onclick="hapus('${b.id}')" class="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-xs font-bold">🗑️ Hapus</button>
        </div>`;
    } else {
      // PELANGGAN: KOSONG, gak ada stok, gak ada TERSEDIA
      infoAdmin = '';
    }

    html += `<div class="kartu"><div class="relative">${foto}<div class="absolute top-1 left-1">${badgeBaru}</div></div>${isiKartu}${infoAdmin}</div>`;
  });

  if (hasilCari.length === 0) html = `<p class="text-center text-gray-400 py-4 col-span-2">Barang gak ketemu, coba kata lain</p>`;
  const tabel = el('tabel'); if (tabel) tabel.innerHTML = html;
  const info = el('infoPage'); if (info) info.innerText = `Page ${currentPage} / ${totalPage} (Total ${hasilCari.length} barang)`;
  const foot = document.querySelector('.footer');
  if (foot) foot.innerHTML = (IS_ADMIN_PAGE && isLogin)
    ? `Total Jenis Produk: ${barang.length} | Total Untung: Rp ${totalUntung.toLocaleString('id-ID')}`
    : `Total Jenis Produk: ${barang.length}`;
}

window.gantiPage = (n) => {
  let tp = Math.max(1, Math.ceil(barang.length / perPage));
  currentPage += n; if (currentPage < 1) currentPage = 1; if (currentPage > tp) currentPage = tp;
  render(); window.scrollTo(0, 0);
};

window.simpan = async () => {
  await initFirebase();
  if (!isLogin) { toastError("Harus Login dulu!"); return; }
  let nama = el('nama').value.trim();
  let modal = Number(el('modal').value);
  let jual = Number(el('harga').value);
  let keterangan = bersihKet(el('keterangan').value);
  let stok = el('stok').value.trim();
  if (!nama || !modal || !jual || !stok) { toastError("Isi dulu!"); return; }
  let tanggalUpdate = getTanggalHariIni(); let fotoBaru = window.FOTO_BARU || null;
  try {
    if (editId) {
      let dataPublic = { nama, jual, harga: jual, keterangan, stok, tanggalUpdate };
      if (fotoBaru) dataPublic.foto = fotoBaru;
      else { let lama = barang.find(x => x.id === editId); if (lama && lama.foto) dataPublic.foto = lama.foto; }
      await fb.setDoc(fb.doc(db, "barang_public", editId), dataPublic);
      await fb.setDoc(fb.doc(db, "barang_private", editId), { modal });
      editId = null; if (el('btnSimpan')) el('btnSimpan').innerText = "SIMPAN";
    } else {
      let dataBaru = { nama, jual, harga: jual, keterangan, stok, tanggalUpdate };
      if (fotoBaru) dataBaru.foto = fotoBaru;
      let refBaru = await fb.addDoc(fb.collection(db, "barang_public"), dataBaru);
      await fb.setDoc(fb.doc(db, "barang_private", refBaru.id), { modal });
    }
    window.FOTO_BARU = null;
    const prev = el('fotoPreview'); if (prev) { prev.src = ''; prev.classList.add('hidden'); }
    const inpFoto = el('fotoInput'); if (inpFoto) inpFoto.value = '';
    const st = el('fotoStatus'); if (st) st.innerText = '';
    el('nama').value = ''; el('modal').value = ''; el('harga').value = ''; el('keterangan').value = ''; el('stok').value = '';
    const pf = el('popupForm'); if (pf) pf.classList.add('hidden'); toast('✅ Berhasil disimpan!');
  } catch (e) { toastError("Gagal simpan! Foto kegedean, coba foto lain."); }
};

window.editBarang = (id) => {
  if (!isLogin) { toastError("Harus Login dulu!"); return; }
  let b = barang.find(x => x.id === id); if (!b) { toastError("Barang gak ketemu, refresh dulu!"); return; }
  el('nama').value = b.nama; el('modal').value = b.modal || ''; el('harga').value = b.jual || b.harga; el('keterangan').value = bersihKet(b.keterangan); el('stok').value = b.stok; window.FOTO_BARU = null;
  const prev = el('fotoPreview'); const st = el('fotoStatus');
  if (prev) {
    if (b.foto) { prev.src = b.foto; prev.classList.remove('hidden'); if (st) st.innerText = 'Foto lama masih ada. Pilih foto baru kalau mau ganti.'; }
    else { prev.src = ''; prev.classList.add('hidden'); if (st) st.innerText = 'Belum ada foto, silahkan pilih foto.'; }
  }
  const inpFoto = el('fotoInput'); if (inpFoto) inpFoto.value = '';
  editId = id; if (el('btnSimpan')) el('btnSimpan').innerText = "UPDATE";
  if (el('judulForm')) el('judulForm').innerText = 'Edit Barang';
  const pf = el('popupForm'); if (pf) pf.classList.remove('hidden');
};

window.hapus = async (id) => {
  await initFirebase();
  if (!isLogin) { toastError("Harus Login dulu!"); return; }
  if (confirm("Hapus?")) {
    await fb.deleteDoc(fb.doc(db, "barang_public", id));
    await fb.deleteDoc(fb.doc(db, "barang_private", id));
    toast('Barang dihapus');
  }
};

window.batalEdit = () => {
  editId = null; window.FOTO_BARU = null;
  const prev = el('fotoPreview'); if (prev) { prev.src = ''; prev.classList.add('hidden'); }
  const inpFoto = el('fotoInput'); if (inpFoto) inpFoto.value = '';
  const st = el('fotoStatus'); if (st) st.innerText = '';
  if (el('nama')) el('nama').value = ''; if (el('modal')) el('modal').value = '';
  if (el('harga')) el('harga').value = ''; if (el('keterangan')) el('keterangan').value = '';
  if (el('stok')) el('stok').value = ''; if (el('btnSimpan')) el('btnSimpan').innerText = "SIMPAN";
  const pf = el('popupForm'); if (pf) pf.classList.add('hidden');
};

// === Render instan dari cache lokal, lalu Firebase dimuat di background ===
try {
  const cachePub = JSON.parse(localStorage.getItem('bilal_cache_public') || 'null');
  if (cachePub && Array.isArray(cachePub)) { barangPublic = cachePub; gabungData(); }
  if (IS_ADMIN_PAGE) {
    const cachePriv = JSON.parse(localStorage.getItem('bilal_cache_private') || 'null');
    if (cachePriv && typeof cachePriv === 'object') { barangPrivate = cachePriv; gabungData(); }
  }
} catch (e) { }

function mulaiFirebase() {
  initFirebase().then(() => {
    fb.onSnapshot(fb.query(fb.collection(db, "barang_public"), fb.orderBy("nama")), (snap) => {
      let baru = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      let hash = JSON.stringify(baru.map(b => b.id + b.nama + b.jual + b.stok));
      if (hash === lastDataHash && sudahRenderPertama) return;
      lastDataHash = hash; barangPublic = baru;
      try { localStorage.setItem('bilal_cache_public', JSON.stringify(baru)); } catch (e) { }
      gabungData();
    });
    if (IS_ADMIN_PAGE) {
      fbAuth.onAuthStateChanged(auth, (user) => {
        let loginBaru = !!user && user.uid === ADMIN_UID;
        if (loginBaru === isLogin && sudahRenderPertama) return;
        isLogin = loginBaru;
        if (isLogin) mulaiDengarPrivate(); else { if (unsubPrivate) { unsubPrivate(); unsubPrivate = null; } barangPrivate = {}; }
        updateUI(); render();
      });
    }
  }).catch(() => { });
}
if ('requestIdleCallback' in window) requestIdleCallback(mulaiFirebase, { timeout: 1500 });
else setTimeout(mulaiFirebase, 0);

// === Tombol X di pencarian - otomatis nempel, gak perlu edit index.html ===
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.querySelector('input[oninput*="cariBarang"]') || el('inputCari') || document.querySelector('input[placeholder*="Cari"]');
  if (!inp) return;
  if (document.getElementById('btnClearCari')) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;flex:1;display:flex;align-items:center;';
  inp.parentNode.insertBefore(wrap, inp);
  wrap.appendChild(inp);
  inp.style.paddingRight = '38px';
  inp.style.width = '100%';
  const btnX = document.createElement('button');
  btnX.id = 'btnClearCari';
  btnX.innerText = '✕';
  btnX.type = 'button';
  btnX.setAttribute('aria-label', 'Hapus pencarian');
  btnX.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);width:26px;height:26px;border-radius:50%;background:#e5e7eb;color:#555;font-size:13px;font-weight:bold;display:none;align-items:center;justify-content:center;border:none;cursor:pointer;z-index:2;';
  btnX.onclick = () => window.hapusCari();
  wrap.appendChild(btnX);
  const cekX = () => { btnX.style.display = inp.value ? 'flex' : 'none'; };
  inp.addEventListener('input', cekX);
  cekX();
});
// FIX PAKSA: Hapus dobel STOK: -> jadi Stok | 9 aja
setInterval(() => {
  document.querySelectorAll('b').forEach(b => {
    if (b.textContent.trim().startsWith('STOK:')) {
      b.textContent = b.textContent.replace('STOK:', '').trim();
    }
  });
}, 300);
// FIX FINAL X: Pake flex, bukan absolute, biar selalu pas tengah
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.querySelector('input[oninput*="cariBarang"]');
  if (!inp) return;
  const lama = document.getElementById('btnClearCari');
  if (lama) lama.remove();
  // Bungkus jadi flex
  const wrap = inp.parentNode;
  wrap.style.cssText = 'position:relative;display:flex;align-items:center;';
  inp.style.paddingRight = '42px';
  const btnX = document.createElement('button');
  btnX.id = 'btnClearCari';
  btnX.innerText = '✕';
  btnX.type = 'button';
  // Kunci: margin-left minus, jadi dia nempel di dalam kotak, tapi ikut flex = selalu tengah
  btnX.style.cssText = 'margin-left:-38px;width:28px;height:28px;min-width:28px;border-radius:50%;background:#e5e7eb;color:#555;font-size:14px;font-weight:bold;display:none;align-items:center;justify-content:center;border:none;cursor:pointer;z-index:5;';
  btnX.onclick = () => window.hapusCari();
  wrap.appendChild(btnX);
  const cek = () => { btnX.style.display = inp.value ? 'flex' : 'none'; };
  inp.addEventListener('input', cek);
  cek();
});
