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
  let totalUntung = 0, totalBarang = list.length;
  let html = '';
  list.forEach(b => {
    let untung = (b.jual || b.harga) - b.modal;
    totalUntung += untung * b.stok;
    html += `<tr class="border-b"><td class="p-2">${b.nama}</td><td class="p-2">Rp ${Number(b.modal).toLocaleString('id-ID')}</td><td class="p-2">Rp ${Number(b.jual || b.harga).toLocaleString('id-ID')}</td><td class="p-2">Rp ${untung.toLocaleString('id-ID')}</td><td class="p-2 text-center">${b.stok}</td><td class="p-2"><button onclick="editBarang('${b.id}')" class="bg-green-500 text-white px-2 py-1 rounded">Edit</button> <button onclick="hapus('${b.id}')" class="bg-red-500 text-white px-2 py-1 rounded">Hapus</button></td></tr>`;
  });
  let tabel = document.getElementById('tabel') || document.getElementById('list');
  if (tabel) tabel.innerHTML = html;
  let totalEl = document.getElementById('total') || document.getElementById('totalBarang');
  if (totalEl) totalEl.innerText = `${totalBarang}`;
  let footer = document.querySelector('.footer');
  if (footer) footer.innerHTML = `Total Barang: <span id="total">${totalBarang}</span> | Total Untung Stok: Rp ${totalUntung.toLocaleString('id-ID')}`;
}
window.cariRender = render;
document.getElementById('cari')?.addEventListener('input', render);
window.simpan = async () => {
  let nama = document.getElementById('nama').value;
  let modal = Number(document.getElementById('modal').value);
  let hargaEl = document.getElementById('harga') || document.getElementById('jual');
  let jual = Number(hargaEl.value);
  let stok = Number(document.getElementById('stok').value);
  if (!nama || !modal || !jual) return alert("Isi Nama, Modal, Jual dulu!");
  if (editId) { await updateDoc(doc(db, "barang", editId), { nama, modal, jual, harga: jual, stok }); editId = null; document.getElementById('btnSimpan').innerText = "SIMPAN"; }
  else { await addDoc(collection(db, "barang"), { nama, modal, jual, harga: jual, stok }); }
  document.getElementById('nama').value = ''; document.getElementById('modal').value = ''; hargaEl.value = ''; document.getElementById('stok').value = '';
};
window.editBarang = (id) => {
  let b = barang.find(x => x.id === id);
  document.getElementById('nama').value = b.nama; document.getElementById('modal').value = b.modal;
  let hargaEl = document.getElementById('harga') || document.getElementById('jual'); hargaEl.value = b.jual || b.harga;
  document.getElementById('stok').value = b.stok; editId = id;
  document.getElementById('btnSimpan').innerText = "UPDATE"; window.scrollTo(0, 0);
};
window.hapus = async (id) => { if (confirm("Hapus?")) await deleteDoc(doc(db, "barang", id)); };
window.batalEdit = () => { editId = null; document.getElementById('nama').value = ''; document.getElementById('modal').value = ''; let h = document.getElementById('harga') || document.getElementById('jual'); h.value = ''; document.getElementById('stok').value = ''; document.getElementById('btnSimpan').innerText = "SIMPAN"; };
