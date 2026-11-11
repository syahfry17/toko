// ==========================================
// UD. BILAL - script.js (RAPI)
// Firebase + Tampilan Admin / Pengunjung
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

// ---------- HELPER TANGGAL (BARU) ----------
// Biar tanggalnya otomatis ke-update pas abang simpan
function getTanggalHariIni() {
  return new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function isHariIni(tgl) {
  if (!tgl) return false;
  return tgl === getTanggalHariIni();
}

// ---------- HELPER LAMA ABANG - TETAP ----------
function bersihKet(teks) {
  if (!teks) return '';
  return teks.toString().replace(/^\s*\/\s*/, '').trim();
}

function tampilStok(b) {
  let s = (b.stok ?? '').toString().trim();
  if (!s) return '0';
  return s;
}

// ---------- AMBIL DATA DARI FIREBASE ----------
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

  let form = document.getElementById('boxForm');
  if (isLogin) form.classList.remove('opacity-40', 'pointer-events-none');
  else form.classList.add('opacity-40', 'pointer-events-none');
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

// ---------- RENDER KARTU ----------
function render() {
  updateUI();

  let totalUntung = 0;
  barang.forEach(b => {
    let j = b.jual || b.harga || 0;
    let stokAngka = parseFloat(String(b.stok ?? '').replace(',', '.')) || 0;
    totalUntung += (j - b.modal) * stokAngka;
  });

  let totalPage = Math.max(1, Math.ceil(barang.length / perPage));
  if (currentPage > totalPage) currentPage = totalPage;
  let list = barang.slice((currentPage - 1) * perPage, currentPage * perPage);

  let html = '';

  list.forEach(b => {
    let j = b.jual || b.harga || 0;
    let u = j - b.modal;
    let ket = bersihKet(b.keterangan);
    let tgl = b.tanggalUpdate || '-';
    let badgeBaru = isHariIni(b.tanggalUpdate)
      ? `<span class="badge-baru">BARU</span>`
      : '';

    let tombol = isLogin
  ? `<div class="flex">
       <button onclick="editBarang('${b.id}')" title="Edit" class="flex-1 bg-green-500 text-white py-3 text-2xl">✏️</button>
       <button onclick="hapus('${b.id}')" title="Hapus" class="flex-1 bg-red-500 text-white py-3 text-2xl">🗑️</button>
     </div>`
  : `<div class="bg-gray-100 text-center py-2 text-sm font-bold text-gray-500">🔒 Login untuk Edit / Hapus</div>`;

    // Modal + Untung cuma muncul kalo udah login - TETAP KAYAK PUNYA ABANG
    let barisModal = isLogin
      ? `<div class="px-3 py-2 flex justify-between border-b border-gray-200"><span class="text-gray-500">Harga Modal</span><span class="font-bold">Rp ${Number(b.modal).toLocaleString('id-ID')}</span></div>`
      : '';
    let barisUntung = isLogin
      ? `<div class="px-3 py-2 flex justify-between"><span class="text-gray-500">Untung</span><span class="font-bold ${u >= 0 ? 'text-green-600' : 'text-red-600'}">Rp ${u.toLocaleString('id-ID')}</span></div>`
      : '';

    // ===== INI YANG BARU: TANGGAL =====
    // Admin -> Terakhir Update lengkap di bawah nama
    // Pengunjung -> Harga terbaru + badge BARU
    let barisTanggal = isLogin
      ? `<div class="px-3 pt-2"><span class="last-update">Terakhir Update: ${tgl}</span></div>`
      : `<div class="px-3 pt-2"><span class="harga-terbaru">✅ Harga terbaru: ${tgl}</span></div>`;

    html += `<div class="border-2 border-gray-300 rounded-xl overflow-hidden">
      <div class="flex justify-between items-center bg-blue-50 px-3 py-2 border-b-2 border-gray-300">
        <span class="font-bold text-lg">${b.nama} ${badgeBaru}</span>
        <span class="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">STOK: ${tampilStok(b)}</span>
      </div>
      ${barisTanggal}
      ${barisModal}
      <div class="px-3 py-2 flex justify-between border-b border-gray-200"><span class="text-gray-500">Harga Jual</span><span class="font-bold">Rp ${Number(j).toLocaleString('id-ID')}</span></div>
      <div class="px-3 py-2 flex justify-between border-b border-gray-200"><span class="text-gray-500">Keterangan</span><span class="font-bold">${ket ? ket : '-'}</span></div>
      ${barisUntung}
      ${tombol}
    </div>`;
  });

  if (barang.length === 0) html = `<p class="text-center text-gray-400 py-4">Belum ada barang</p>`;
  document.getElementById('tabel').innerHTML = html;
  document.getElementById('infoPage').innerText = `Page ${currentPage} / ${totalPage} (Total ${barang.length} barang)`;
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

// ---------- SIMPAN / UPDATE ----------
window.simpan = async () => {
  if (!isLogin) return alert("Harus Login dulu!");
  let nama = document.getElementById('nama').value;
  let modal = Number(document.getElementById('modal').value);
  let jual = Number(document.getElementById('harga').value);
  let keterangan = bersihKet(document.getElementById('keterangan').value);
  let stok = document.getElementById('stok').value.trim();
  if (!nama || !modal || !jual || !stok) return alert("Isi dulu!");

  // OTOMATIS: tanggal ke-update tiap abang simpan / edit harga
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
  window.scrollTo(0, 0);
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
};
