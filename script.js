import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const firebaseConfig = { apiKey: "AIzaSyAhce1AyhPGe1cDkIzcBcgAFFOXC2Isxx0", authDomain: "toko-bilal.firebaseapp.com", projectId: "toko-bilal", storageBucket: "toko-bilal.firebasestorage.app", messagingSenderId: "507155195256", appId: "1:507155195256:web:39185c267b272b5672948d" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let barang = [], editId = null;
onSnapshot(query(collection(db, "barang"), orderBy("nama")), (snap) => { barang = snap.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
function render() {
  let q = document.getElementById('cari') ? document.getElementById('cari').value.toLowerCase() : '';
  let list = barang.filter(b => b.nama.toLowerCase().includes(q));
  let totalUntung = 0; let html = '';
  list.forEach(b => {
    let j = b.jual || b.harga || 0; let u = j - b.modal; totalUntung += u * b.stok;
    html += `<div class="border rounded-xl p-3 bg-gray-50">
      <div class="flex justify-between items-center mb-2"><span class="font-bold text-lg">${b.nama}</span><span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">Stok: ${b.stok}</span></div>
      <div class="text-sm text-gray-600 space-y-1"><div class="flex justify-between"><span>Modal</span><span class="font-bold text-black">Rp ${Number(b.modal).toLocaleString('id-ID')}</span></div><div class="flex justify-between"><span>Jual</span><span class="font-bold text-black">Rp ${Number(j).toLocaleString('id-ID')}</span></div><div class="flex justify-between"><span>Untung / pcs</span><span class="font-bold text-green-600">Rp ${u.toLocaleString('id-ID')}</span></div></div>
      <div class="flex gap-2 mt-3"><button onclick="editBarang('${b.id}')" class="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold text-sm">Edit</button><button onclick="hapus('${b.id}')" class="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold text-sm">Hapus</button></div>
    </div>`;
  });
  if(list.length===0) html = `<p class="text-center text-gray-400 py-4">Belum ada barang, input di atas dulu</p>`;
  document.getElementById('tabel').innerHTML = html;
  document.querySelector('.footer').innerHTML = `Total Barang: ${list.length} | Total Untung Stok: Rp ${totalUntung.toLocaleString('id-ID')}`;
}
document.getElementById('cari')?.addEventListener('input', render);
window.simpan = async () => {
  let nama = document.getElementById('nama').value; let modal = Number(document.getElementById('modal').value); let jual = Number(document.getElementById('harga').value); let stok = Number(document.getElementById('stok').value);
  if (!nama || !modal || !jual) return alert("Isi dulu!");
  if (editId) { await updateDoc(doc(db, "barang", editId), { nama, modal, jual, harga: jual, stok }); editId = null; document.getElementById('btnSimpan').innerText = "SIMPAN"; }
  else { await addDoc(collection(db, "barang"), { nama, modal, jual, harga: jual, stok }); }
  document.getElementById('nama').value=''; document.getElementById('modal').value=''; document.getElementById('harga').value=''; document.getElementById('stok').value='';
};
window.editBarang = (id) => { let b = barang.find(x => x.id === id); document.getElementById('nama').value = b.nama; document.getElementById('modal').value = b.modal; document.getElementById('harga').value = b.jual || b.harga; document.getElementById('stok').value = b.stok; editId = id; document.getElementById('btnSimpan').innerText = "UPDATE"; window.scrollTo(0,0); };
window.hapus = async (id) => { if (confirm("Hapus?")) await deleteDoc(doc(db, "barang", id)); };
window.batalEdit = () => { editId = null; document.getElementById('nama').value=''; document.getElementById('modal').value=''; document.getElementById('harga').value=''; document.getElementById('stok').value=''; document.getElementById('btnSimpan').innerText="SIMPAN"; };
