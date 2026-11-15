import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- GANTI PAKE CONFIG ASLI ABANG ---
const firebaseConfig = {
  apiKey: "ISI_APIKEY_ABANG",
  authDomain: "ISI_AUTHDOMAIN_ABANG",
  projectId: "ISI_PROJECTID_ABANG",
  storageBucket: "ISI_STORAGE_ABANG",
  messagingSenderId: "ISI_SENDER_ABANG",
  appId: "ISI_APPID_ABANG"
};
// -----------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let allBarang = [];

function angkaStok(s){
  if(!s) return 0;
  const m = String(s).match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

async function loadBarang(){
  const snap = await getDocs(collection(db, "barang"));
  allBarang = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderAdmin();
  if(document.getElementById("listBarang")) renderToko();
}

window.renderAdmin = function(){
  const list = document.getElementById("listBarangAdmin");
  if(!list) return;
  const q = (document.getElementById("cariAdmin")?.value || "").toLowerCase();
  const filtered = allBarang.filter(b => (b.nama||"").toLowerCase().includes(q));

  // STATISTIK PERSIS KAYAK SCREENSHOT
  document.getElementById("totalProduk").textContent = allBarang.length;
  let totalUntung = 0;
  allBarang.forEach(b => { totalUntung += (Number(b.harga)||0) - (Number(b.modal)||0); });
  document.getElementById("totalUntung").textContent = "Rp " + totalUntung.toLocaleString("id-ID");
  document.getElementById("stokMenipis").textContent = allBarang.filter(b => angkaStok(b.stok) <= 5).length;

  if(filtered.length === 0){
    list.innerHTML = `<p class="text-center text-sm text-gray-400 py-6 col-span-2">Belum ada barang</p>`;
    return;
  }

  list.innerHTML = filtered.map(b => {
    const harga = Number(b.harga)||0;
    const modal = Number(b.modal)||0;
    const untung = harga - modal;
    const stokAngka = angkaStok(b.stok);
    const mauHabis = stokAngka <= 5 && stokAngka > 0;
    return `
    <div class="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div class="relative h-48 bg-white flex items-center justify-center overflow-hidden">
        ${b.gambar ? `<img src="${b.gambar}" class="h-full w-full object-contain p-2">` : `<p class="text-gray-400 text-sm">Belum ada foto</p>`}
        ${b.baru ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">BARU</span>` : ``}
      </div>
      <div class="p-3 flex flex-col flex-1">
        <p class="font-bold text-[16px] leading-tight text-center">${b.nama||""}</p>
        <p class="text-gray-400 text-center mt-3">Rp${harga.toLocaleString("id-ID")}</p>
        <p class="text-gray-400 text-sm text-center mt-1">${b.deskripsi||"-"}</p>
        <div class="border-t mt-3 pt-2 text-[13px] text-gray-500 space-y-0.5 mt-auto">
          <div class="flex justify-between"><span>Modal</span><span class="text-black font-medium">Rp ${modal.toLocaleString("id-ID")}</span></div>
          <div class="flex justify-between"><span>Untung</span><span class="text-green-600 font-medium">Rp ${untung.toLocaleString("id-ID")}</span></div>
          <div class="flex justify-between"><span>Stok</span><span class="text-black font-medium">${b.stok||"-"}</span></div>
          ${mauHabis ? `<p class="text-red-500 font-bold text-right text-[13px]">⚠️ MAU HABIS!</p>` : ``}
        </div>
        <div class="flex gap-2 mt-3"><button onclick="editBarang('${b.id}')" class="btn-edit"><span class="ico">✏️</span><span>Edit</span></button><button onclick="hapusBarang('${b.id}')" class="btn-hapus"><span class="ico">🗑️</span><span>Hapus</span></button></div>
      </div>
    </div>`;
  }).join("");
};

// BUAT TOKO (index.html)
window.renderToko = function(){
  const list = document.getElementById("listBarang");
  if(!list) return;
  list.innerHTML = allBarang.map(b => `
    <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div class="h-40 bg-white flex items-center justify-center">${b.gambar ? `<img src="${b.gambar}" class="h-full w-full object-contain p-2">` : `<p class="text-gray-400 text-sm">Belum ada foto</p>`}</div>
      <div class="p-3"><p class="font-bold text-center">${b.nama}</p><p class="text-green-600 font-extrabold text-center mt-1">Rp ${(Number(b.harga)||0).toLocaleString("id-ID")}</p><p class="text-xs text-gray-400 text-center mt-1">Stok: ${b.stok||"-"}</p></div>
    </div>`).join("");
};

window.bukaFormTambah = function(){
  document.getElementById("editId").value = "";
  document.getElementById("formTitle").textContent = "Tambah Barang Baru";
  document.getElementById("formBarang").classList.remove("hidden");
  window.scrollTo({top:0, behavior:"smooth"});
};

window.tutupForm = function(){
  document.getElementById("formBarang").classList.add("hidden");
  ["nama","harga","modal","stok","kategori","gambar","deskripsi"].forEach(i=>{ if(document.getElementById(i)) document.getElementById(i).value=""; });
  document.getElementById("editId").value = "";
};

window.simpanBarang = async function(){
  const id = document.getElementById("editId").value;
  const data = {
    nama: document.getElementById("nama").value,
    harga: Number(document.getElementById("harga").value)||0,
    modal: Number(document.getElementById("modal").value)||0,
    stok: document.getElementById("stok").value,
    kategori: document.getElementById("kategori").value,
    gambar: document.getElementById("gambar").value,
    deskripsi: document.getElementById("deskripsi").value
  };
  if(!data.nama) return alert("Nama barang wajib diisi!");
  if(id) await updateDoc(doc(db,"barang",id), data);
  else await addDoc(collection(db,"barang"), data);
  tutupForm();
  loadBarang();
};

window.editBarang = function(id){
  const b = allBarang.find(x=>x.id===id);
  if(!b) return;
  document.getElementById("editId").value = b.id;
  document.getElementById("nama").value = b.nama||"";
  document.getElementById("harga").value = b.harga||"";
  document.getElementById("modal").value = b.modal||"";
  document.getElementById("stok").value = b.stok||"";
  document.getElementById("kategori").value = b.kategori||"";
  document.getElementById("gambar").value = b.gambar||"";
  document.getElementById("deskripsi").value = b.deskripsi||"";
  document.getElementById("formTitle").textContent = "Edit Barang";
  document.getElementById("formBarang").classList.remove("hidden");
  window.scrollTo({top:0, behavior:"smooth"});
};

window.hapusBarang = async function(id){
  if(!confirm("Yakin hapus barang ini?")) return;
  await deleteDoc(doc(db,"barang",id));
  loadBarang();
};

window.logout = function(){
  localStorage.removeItem("admin");
  window.location.href = "index.html";
};

loadBarang();
