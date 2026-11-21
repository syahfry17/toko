const NOMOR_WA = "6281919194295";

let barangPublic = [];
let barangPrivate = {};
let barang = [];
let editId = null;
let currentPage = 1;
const perPage = 12;
let isLogin = false;
let kataCari = '';
let readVersion = 0;
window.FOTO_BARU = null;
window.FOTO_LAMA = null; // link foto lama, buat hapus kalau diganti
const IS_ADMIN_PAGE = !!document.getElementById('gateAdmin');
let loginBusy = false, writeBusy = false, privateReady = false;
const protectedElements = Array.from(document.querySelectorAll('.butuh-login'));

function bolehKelola(){ return IS_ADMIN_PAGE && isLogin; }
function pesanError(e){ return e?.message || 'Koneksi gagal. Coba lagi.'; }
function fotoAman(value){
  const v = String(value || '').trim();
  return /^(https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(v) || /^(?:\.\.?\/)?[\w/-]+\.(?:png|jpe?g|webp|gif)$/i.test(v) ? v : '';
}
function aksi(nama, id){ return aman(nama + '(' + JSON.stringify(String(id)) + ')'); }

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

let cropScale = 1, cropX = 0, cropY = 0, cropImgW = 0, cropImgH = 0;
let cropStartX = 0, cropStartY = 0, cropStartPX = 0, cropStartPY = 0, cropDragging = false, cropPointerId = null;

function clampCrop(){
  const img = el('cropImg');
  const side = el('cropFrame').getBoundingClientRect().width;
  if (!side || !img.naturalWidth) return;
  const fit = side / Math.min(img.naturalWidth, img.naturalHeight);
  cropImgW = img.naturalWidth * fit;
  cropImgH = img.naturalHeight * fit;
  img.style.width = cropImgW + 'px';
  img.style.height = cropImgH + 'px';
  const maxX = Math.max(0, (cropImgW * cropScale - side) / 2);
  const maxY = Math.max(0, (cropImgH * cropScale - side) / 2);
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

window.addEventListener('resize', () => {
  if (el('cropFrame')?.getBoundingClientRect().width) updateCropTransform();
});

function bukaCrop(base64){
  cropScale = 1; cropX = 0; cropY = 0; const img = el('cropImg'); if(!img) return;
  img.onload = updateCropTransform;
  img.src = base64;
  const sl = el('zoomSlider'); if(sl) sl.value = 100; const m=el('cropModal'); if(m) m.classList.remove('hidden');
}
window.batalCrop = () => { const m=el('cropModal'); if(m) m.classList.add('hidden'); const inp=el('fotoInput'); if(inp) inp.value=''; };
function dataURLkeBlob(dataURL){
  const [head, data] = dataURL.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

window.potongFoto = () => {
  const img = el('cropImg');
  if (!img || !img.complete || !img.naturalWidth) return;
  updateCropTransform();
  const frame = el('cropFrame').getBoundingClientRect();
  const photo = img.getBoundingClientRect();
  if (!frame.width || !photo.width) return;
  const ratio = img.naturalWidth / photo.width;
  const sx = (frame.left - photo.left) * ratio;
  const sy = (frame.top - photo.top) * ratio;
  const side = frame.width * ratio;
  const canvas = document.createElement('canvas');
  let hasil;
  for (const size of [400, 320, 256, 192]) {
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    for (const quality of [0.78, 0.68, 0.58, 0.48]) {
      hasil = canvas.toDataURL('image/jpeg', quality);
      if (hasil.length < 100000) break;
    }
    if (hasil.length < 100000) break;
  }
  if (hasil.length >= 100000) return toastError('Foto masih terlalu besar untuk disimpan.');
  const ukKB = (hasil.length / 1000).toFixed(1);
  // BARU (Langkah 2): simpan sebagai FILE (Blob), bukan string Base64.
  // File inilah yang nanti di-upload ke Storage di fungsi simpan().
  window.FOTO_BARU = dataURLkeBlob(hasil);
  const prev = el('fotoPreview'); if(prev){ prev.src = hasil; prev.classList.remove('hidden'); }
  const st = el('fotoStatus'); if(st) st.innerText = `✅ Foto otomatis dikompres jadi ${ukKB} KB, siap disimpan!`;
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
// MUBAZIR 3 DIBENERIN: previewFoto dihapus, udah ada addEventListener 'change' di bawah yang ngurus fotoInput. 1 aja cukup.
document.addEventListener('change', (e)=>{ if(e.target && e.target.id === 'fotoInput'){ if(e.target.files[0]) olahFoto(e.target.files[0]); } });

document.addEventListener('DOMContentLoaded', () => {
  const box = el('cropBox'); if(!box) return;
  box.addEventListener('pointerdown', (e)=>{ cropDragging=true; cropPointerId=e.pointerId; cropStartX=e.clientX; cropStartY=e.clientY; cropStartPX=cropX; cropStartPY=cropY; box.setPointerCapture(e.pointerId); e.preventDefault(); });
  box.addEventListener('pointermove', (e)=>{ if(!cropDragging || e.pointerId!==cropPointerId) return; cropX=cropStartPX+(e.clientX-cropStartX); cropY=cropStartPY+(e.clientY-cropStartY); updateCropTransform(); e.preventDefault(); });
  const endDrag=(e)=>{ if(e.pointerId===cropPointerId){ cropDragging=false; cropPointerId=null; } };
  box.addEventListener('pointerup', endDrag); box.addEventListener('pointercancel', endDrag);
});

function getTanggalHariIni(){return new Date().toLocaleDateString('sv-SE');}
function isHariIni(tgl){return tgl === getTanggalHariIni();}
function bersihKet(teks) { if (!teks) return ''; return teks.toString().replace(/^\s*\/\s*/, '').trim(); }
function aman(teks) { return String(teks ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function tampilStok(b) { let s = (b.stok ?? '').toString().trim(); if (!s) return '0'; return s; }
function gabungData() { barang = barangPublic.map(p => ({ ...p, modal: (barangPrivate[p.id] ? barangPrivate[p.id].modal : 0) })); render(); }

async function muat(){
  const ticket = ++readVersion;
  const [produk,modal] = await Promise.all([semua('barang_public','id'), bolehKelola() ? semua('barang_private','id') : []]);
  if(ticket!==readVersion) return;
  barangPublic = produk.sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
  barangPrivate = Object.fromEntries(modal.map(row=>[row.id,row]));
  privateReady = bolehKelola();
  gabungData();
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
  try { if (isLogin) { await hasil(db.auth.signOut()); toast('Berhasil Logout'); } else updateUI(); }
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
    await masuk(email, pass);
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

function filteredBarang(){
  return barang.filter(b => String(b.nama ?? '').toLowerCase().includes(kataCari) || String(b.keterangan ?? '').toLowerCase().includes(kataCari));
}

function render() {
  // MUBAZIR: sudahRenderPertama dihapus, nggak pernah dibaca di mana-mana
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

  let hasilCari = filteredBarang();
  let totalPage = Math.max(1, Math.ceil(hasilCari.length / perPage)); if (currentPage > totalPage) currentPage = totalPage;
  let list = hasilCari.slice((currentPage - 1) * perPage, currentPage * perPage); let html = '';
  list.forEach(b => {
    let j = b.jual ?? b.harga ?? 0; let modal = b.modal || 0; let u = j - modal; let ket = bersihKet(b.keterangan);
    let badgeBaru = isHariIni(b.tanggal_update) ? `<span class="badge-baru">BARU</span>` : '';
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

window.gantiPage = (n) => { let tp = Math.max(1, Math.ceil(filteredBarang().length / perPage)); currentPage += n; if (currentPage < 1) currentPage = 1; if (currentPage > tp) currentPage = tp; render(); window.scrollTo(0, 0); };

// --- FUNGSI SIMPAN (Upload foto ke Storage, simpan LINK-nya ke Database) ---
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

  // Ambil keadaan form sekali; tidak bergantung pada global setelah await.
  const idEdit = editId;
  const idProduk = idEdit || crypto.randomUUID();
  const fotoLama = window.FOTO_LAMA || null;
  const fotoBaru = window.FOTO_BARU;
  let fotoBaruTerupload = null;
  let tahap = 'upload';

  try {
    let fotoUntukDisimpan = idEdit ? fotoLama : null;
    if (fotoBaru) {
      fotoBaruTerupload = await uploadFoto(fotoBaru, `produk-${idProduk}-${crypto.randomUUID()}.jpg`);
      fotoUntukDisimpan = fotoBaruTerupload;
    }
    tahap = 'database';
    await hasil(db.rpc('simpan_produk', {
      p_id: idProduk, p_baru: !idEdit, p_nama: nama,
      p_jual: jual, p_modal: modal, p_stok: stok, p_keterangan: keterangan,
      p_foto: fotoUntukDisimpan, p_tanggal: getTanggalHariIni()
    }));
  } catch(e) {
    // Respons terputus belum tentu berarti server gagal menyimpan.
    // Jangan hapus foto baru: database mungkin sudah memakai URL tersebut.
    toastError(tahap === 'upload'
      ? 'Upload foto gagal: ' + pesanError(e)
      : 'Hasil penyimpanan belum terkonfirmasi: ' + pesanError(e) + '. Muat ulang dan periksa produk sebelum mencoba lagi.');
    writeBusy = false;
    button.disabled = false;
    button.innerText = editId ? 'UPDATE' : 'SIMPAN';
    return;
  }

  // Database sudah mengonfirmasi sukses. Kegagalan bersih-bersih atau
  // pembacaan ulang tidak boleh membatalkan hasil maupun menghapus foto baru.
  let pesan = '✅ Berhasil disimpan!';
  try {
    const dipakaiProdukLain = barang.some(b => b.id !== idProduk && b.foto === fotoLama);
    if (fotoBaruTerupload && fotoLama && !dipakaiProdukLain) {
      try { await hapusFoto(fotoLama); }
      catch(e) { pesan += ' Foto lama belum dapat dibersihkan.'; }
    }
    writeBusy = false;
    window.batalEdit();
    writeBusy = true;
    try { await muat(); }
    catch(e) { pesan += ' Daftar belum diperbarui; muat ulang halaman.'; }
    toast(pesan);
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
  window.FOTO_LAMA = b.foto || null; // ingat foto lama, buat dihapus kalau diganti
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
    const target = barang.find(x => x.id === id);
    await hasil(db.rpc('hapus_produk', { p_id: id }));
    // BARU (Langkah 2): hapus juga fotonya dari Storage
    if (target?.foto) await hapusFoto(target.foto);
    await muat(); toast('Barang dihapus');
  } catch(e){ toastError(pesanError(e)); }
  finally { writeBusy = false; }
};

window.batalEdit = () => { 
  if(writeBusy) return; 
  editId = null; 
  window.FOTO_BARU = null; window.FOTO_LAMA = null;
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

function refresh(){muat().catch(e=>toastError(pesanError(e)));}
updateUI();
if(IS_ADMIN_PAGE){
  pantauAdmin(async allowed=>{
    isLogin=allowed; privateReady=false; barangPrivate={};
    if(!allowed){
      window.batalEdit();
      ['popupForm','cropModal','boxLogin'].forEach(id=>el(id)?.classList.add('hidden'));
    }
    gabungData();
    await muat();
  },e=>toastError(pesanError(e)));
} else refresh();
// MUBAZIR 1 DIBENERIN: setInterval 60 detik dihapus, cukup visibilitychange aja biar nggak narik data terus.
document.addEventListener('visibilitychange',()=>{if(!document.hidden) refresh();});