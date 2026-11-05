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
  let totalUntung = 0;
  let html = '';
  list.forEach(b => {
    let jualVal = b.jual || b.harga || 0;
    let untung = jualVal - b.modal;
    totalUntung += untung * b.stok;
    html += `<tr><td>${b.nama}</td><td>Rp ${Number(b.modal).toLocaleString('id-ID')}</td><td>Rp ${Number(jualVal).toLocaleString('id-ID')}</td><td>Rp ${untung.toLocaleString('id-ID')}</td><td>${b.stok}</td><td><button onclick="editBarang('${b.id}')">Edit</button> <button onclick="hapus('${b.id}')">Hapus</button></td></tr>`;
  });
  let tabel = document.getElementById('tabel');
  if (tabel) tabel.innerHTML = html;
  let footer = document.querySelector('.footer');
  if (footer) footer.innerHTML = `Total Barang: <span id="total">${list.length}</span> | Total Untung Stok: Rp ${totalUntung.toLocaleString('id-ID')}`;
}
document.getElementById('cari')?.addEventListener('input', render);
window.simpan = async () => {
  let nama = document.getElementById('nama').value;
  let modal = Number(document.getElementById('modal').value);
  let jual = Number(document.getElementById('harga').value);
  let stok = Number(document.getElementById('stok').value);
  if (!nama || !modal || !jual) return alert("Isi Nama, Modal, Jual dulu!");
  if (editId) { await updateDoc(doc(db, "barang", editId), { nama, modal, jual, harga: jual, stok }); editId = null; }
  else { await addDoc(collection(db, "barang"), { nama, modal, jual, harga: jual, stok }); }
  document.getElementById('nama').value = ''; document.getElementById('modal').value = ''; document.getElementById('harga').value = ''; document.getElementById('stok').value = '';
};
window.editBarang = (id) => {
  let b = barang.find(x => x.id === id);
  document.getElementById('nama').value = b.nama; document.getElementById('modal').value = b.modal; document.getElementById('harga').value = b.jual || b.harga; document.getElementById('stok').value = b.stok; editId = id; document.getElementById('btnSimpan').innerText = "UPDATE"; window
