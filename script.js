// ==========================================
// UD. BILAL - script.js (RAPI + POP UP + CARI)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---------- CONFIG FIREBASE ----------
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

// ---------- STATE ----------
let barang = [];
let editId = null;
let currentPage = 1;
const perPage = 10;
let isLogin = false;
let kataCari = '';

// ---------- HELPER TANGGAL ----------
function getTanggalHariIni() {
  return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isHariIni(tgl) {
  if (!tgl) return false;
  return tgl === getTanggalHariIni();
}

function bersihKet(teks) {
  if (!teks) return '';
  return teks.toString().replace(/^\s*\/\s*/, '').trim();
}

function tampilStok(b) {
  let s = (b.stok ?? '').toString().trim();
  if (!s) return '0';
  return s;
}

// ---------- AMBIL DATA ----------
onSnapshot(query(collection(db, "barang"), orderBy("nama")), (snap) => {
  barang = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

onAuthStateChanged(auth, (user) => {
  isLogin = !!user;
  updateUI();
  render();
});

// ---------- UI LOGIN ----------
function updateUI() {
  document.getElementById('statusLogin').innerText = isLogin
    ? '✅ Login Admin - ' + (auth.currentUser ? auth.currentUser.email : '')
    : '🔒 Mode Lihat Saja';
  document.getElementById('statusLogin').className = isLogin
    ? 'text-sm font-bold text-green-600'
    : 'text-sm font-bold text-red-500';
  document.getElementById('btnLogin').innerText = isLogin ? 'LOGOUT' : 'LOGIN';

  let btnTambah = document.getElementById('btnTambah');
  if (btnTambah) {
    if (isLogin) btnTambah.classList.remove('hidden');
    else btnTambah.classList.add('hidden');
  }
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
    await signInWithEmailAndPassword(auth, email, pass);
    document.getElementById('boxLogin').classList.add('hidden');
    document.getElementById('inputPass').value = '';
    alert('Login Berhasil!');
  } catch (e) { alert('Gagal Login: ' + e.message); }
};

// ---------- POP UP FORM ----------
window.bukaForm = () => {
  if (!isLogin) return alert("Harus Login dulu!");
  document.getElementById('judulForm').innerText = editId ? 'Edit Barang' : 'Tambah Barang';
  document.getElementById('popupForm').classList.remove('hidden');
};

window.tutupForm = () => {
  document.getElementById('popupForm').classList.add('hidden');
};

// ---------- CARI ----------
window.cariBarang = (teks) => {
  kataCari = teks.toLowerCase().trim();
  currentPage = 1;
  render();
};

// ---------- RENDER ----------
function render() {
  updateUI();

  let totalUntung = 0;
  barang.forEach(b => {
    let j = b.jual || b.harga || 0;
    let stokAngka = parseFloat(String(b.stok ?? '').replace(',', '.')) || 0;
    totalUntung += (j - b.modal) * stokAngka;
  });

  // FILTER SESUAI PENCARIAN
  let hasilCari = barang.filter(b =>
    b.nama.toLowerCase().includes(kataCari) ||
    (b.keterangan || '').toLowerCase().includes(kataCari)
  );

  let totalPage = Math.max(1, Math.ceil(hasilCari.length / perPage));
  if (currentPage > totalPage) currentPage = totalPage;
  let list = hasilCari.slice((currentPage - 1) * perPage, currentPage * perPage);

  let html = '';

  list.forEach(b => {
    let j = b.jual || b.harga || 0;
    let u = j - b.modal;
    let ket = bersihKet(b.keterangan);
    let tgl = b.tanggalUpdate || '-';
    let badgeBaru = isHariIni(b.tanggalUpdate) ? `<span class="badge-baru">BARU</span>` : '';

    // TOMBOL WA - MODEL BARU: Full, melengkung, ada jarak
    let tombolWA = `<div class="px-3 pb-3"><a href="https://wa.me/6281919194295?text=${encodeURIComponent(`Halo UD. BILAL, saya mau pesan ${b.nama} - Rp ${Number(j).toLocaleString('id-ID')}`)}" target="_blank" class="block text-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl">💬 PESAN VIA WHATSAPP</a></div>`;

    // TOMBOL EDIT / HAPUS - DIPISAH, ada jarak, ada tulisan
    let tombol = isLogin
      ? `<div class="flex gap-2 px-3 pb-3">
           <button onclick="editBarang('${b.id}')" class="flex-1 bg-green-500 text-white py-3 rounded-xl flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
           </button>
           <button onclick="hapus('${b.id}')" class="flex-1 bg-red-500 text-white py-3 rounded-xl flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
           </button>
         </div>`
      : ``;

    // BARIS ABU-ABU PILL + IKON - Tanpa garis kolom
    let barisModal = isLogin
      ? `<div class="mx-3 my-2 bg-gray-100 rounded-xl px-3 py-2.5 flex justify-between items-center"><span>💵 Harga Modal</span><span class="font-bold">Rp ${Number(b.modal).toLocaleString('id-ID')}</span></div>`
      : '';
    let barisUntung = isLogin
      ? `<div class="mx-3 my-2 bg-gray-100 rounded-xl px-3 py-2.5 flex justify-between items-center"><span>↕️ Untung</span><span class="font-bold ${u >= 0 ? 'text-green-600' : 'text-red-600'}">Rp ${u.toLocaleString('id-ID')}</span></div>`
      : '';

    let barisTanggal = `<div class="px-3 pt-2"><span class="last-update">Terakhir Update: ${tgl}</span></div>`;

    html += `<div class="border-2 border-gray-300 rounded-xl overflow-hidden">
      <div class="flex justify-between items-center bg-blue-50 px-3 py-2 border-b-2 border-gray-300">
        <span class="font-bold text-lg">${b.nama} ${badgeBaru}</span>
        <span class="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">STOK: ${tampilStok(b)}</span>
      </div>
      ${barisTanggal}
      ${barisModal}
      <div class="mx-3 my-2 bg-gray-100 rounded-xl px-3 py-2.5 flex justify-between items-center"><span>🏷️ Harga Jual</span><span class="font-bold">Rp ${Number(j).toLocaleString('id-ID')}</span></div>
      <div class="mx-3 my-2 bg-gray-100 rounded-xl px-3 py-2.5 flex justify-between items-center"><span>ℹ️ Keterangan</span><span class="font-bold">${ket ? ket : '-'}</span></div>
      ${barisUntung}
      ${tombolWA}
      ${tombol}
    </div>`;
  });

  if (hasilCari.length === 0) html = `<p class="text-center text-gray-400 py-4">Barang gak ketemu, coba kata lain</p>`;
  document.getElementById('tabel').innerHTML = html;
  document.getElementById('infoPage').innerText = `Page ${currentPage} / ${totalPage} (Total ${hasilCari.length} barang)`;
  document.querySelector('.footer').innerHTML = isLogin
    ? `Total Jenis Produk: ${barang.length} | Total Untung: Rp ${totalUntung.toLocaleString('id-ID')}`
    : `Total Jenis Produk: ${barang.length}`;
}

// ---------- PAGING ----------
window.gantiPage = (n) => {
  let tp = Math.max(1, Math.ceil(barang.length / perPage));
  currentPage += n;
  if (currentPage < 1) currentPage = 1;
  if (currentPage > tp) currentPage = tp;
  render();
  window.scrollTo(0, 0);
};

// ---------- SIMPAN ----------
window.simpan = async () => {
  if (!isLogin) return alert("Harus Login dulu!");
  let nama = document.getElementById('nama').value;
  let modal = Number(document.getElementById('modal').value);
  let jual = Number(document.getElementById('harga').value);
  let keterangan = bersihKet(document.getElementById('keterangan').value);
  let stok = document.getElementById('stok').value.trim();
  if (!nama || !modal || !jual || !stok) return alert("Isi dulu!");

  let tanggalUpdate = getTanggalHariIni();

  try {
    if (editId) {
      await updateDoc(doc(db, "barang", editId), { nama, modal, jual, harga: jual, keterangan, stok, tanggalUpdate });
      editId = null;
      document.getElementById('btnSimpan').innerText = "SIMPAN";
    } else {
      await addDoc(collection(db, "barang"), { nama, modal, jual, harga: jual, keterangan, stok, tanggalUpdate });
    }
    document.getElementById('nama').value = '';
    document.getElementById('modal').value = '';
    document.getElementById('harga').value = '';
    document.getElementById('keterangan').value = '';
    document.getElementById('stok').value = '';
    document.getElementById('popupForm').classList.add('hidden');
  } catch (e) { alert("Gagal simpan: " + e.message); }
};

// ---------- EDIT / HAPUS / BATAL ----------
window.editBarang = (id) => {
  if (!isLogin) return alert("Harus Login dulu!");
  let b = barang.find(x => x.id === id);
  document.getElementById('nama').value = b.nama;
  document.getElementById('modal').value = b.modal;
  document.getElementById('harga').value = b.jual || b.harga;
  document.getElementById('keterangan').value = bersihKet(b.keterangan);
  document.getElementById('stok').value = b.stok;
  editId = id;
  document.getElementById('btnSimpan').innerText = "UPDATE";
  document.getElementById('judulForm').innerText = 'Edit Barang';
  document.getElementById('popupForm').classList.remove('hidden');
};

window.hapus = async (id) => {
  if (!isLogin) return alert("Harus Login dulu!");
  if (confirm("Hapus?")) await deleteDoc(doc(db, "barang", id));
};

window.batalEdit = () => {
  editId = null;
  document.getElementById('nama').value = '';
  document.getElementById('modal').value = '';
  document.getElementById('harga').value = '';
  document.getElementById('keterangan').value = '';
  document.getElementById('stok').value = '';
  document.getElementById('btnSimpan').innerText = "SIMPAN";
  document.getElementById('popupForm').classList.add('hidden');
};
