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
  document.getElementById('list').innerHTML = list.map(b => {
    let untung = b.jual - b.modal; totalUntung += untung * b.stok;
    return `<tr class="border-b"><td class="p-2">${b.nama}</td><td class="p-2">Rp ${Number(b.modal).toLocaleString('id-ID')}</td><td class="p-2">Rp ${Number(b.jual).toLocaleString('id-ID')}</td><td class="p-2">Rp ${untung.toLocaleString('id-ID')}</td><td class="p-2 text-center">${b.stok}</td><td class="p-2"><button onclick="editBarang('${b.id}')" class="bg-green-500 text-white px-2 py-1 rounded-lg text-xs">Edit</button> <button onclick="hapus('${b.id}')" class="bg-red-500 text-white px-2 py-1 rounded-lg text-xs mt-1">Hapus</button></td></tr>`
  }).join('');
  document.getElementById('total').innerText = `Total Barang: ${list.length} | Total Untung Stok: Rp ${totalUntung.toLocaleString('id-ID')}`;
}
window.cariRender = render;
window.simpan = async () => {
  let nama = document.getElementById('nama').value, modal = Number(document.getElementById('modal').value), jual = Number(document.getElementById('jual').value), stok = Number(document.getElementById('stok').value);
  if (!nama || !modal || !jual) return alert("Isi Nama, Modal, Jual dulu!");
  if (editId) { await updateDoc(doc(db, "barang", editId), { nama, modal, jual, stok }); editId = null; document.getElementById('btnSimpan').innerText = "SIMPAN"; }
  else { await addDoc(collection(db, "barang"), { nama, modal, jual, stok }); }
  document.getElementById('nama').value = ''; document.getElementById('modal').value = ''; document.getElementById('jual').value = ''; document.getElementById('stok').value = '';
};
window.editBarang = (id) => { let b = barang.find(x => x.id === id); document.getElementById('nama').value = b.nama; document.getElementById('modal').value = b.modal; document.getElementById('jual').value = b.jual; document.getElementById('stok').value = b.stok; editId = id; document.getElementById('btnSimpan').innerText = "UPDATE"; window.scrollTo(0, 0); };
window.hapus = async (id) => { if (confirm("Hapus?")) await deleteDoc(doc(db, "barang", id)); };
