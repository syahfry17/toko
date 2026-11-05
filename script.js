let data = JSON.parse(localStorage.getItem('toko_bilal') || '[]');

function simpan(){
  let nama = document.getElementById('nama').value;
  let modal = document.getElementById('modal').value;
  let harga = document.getElementById('harga').value;
  let stok = document.getElementById('stok').value;
  let editIndex = document.getElementById('editIndex').value;
  if(!nama || !harga || !stok) return alert('Isi nama, harga jual & stok dulu bang!');
  if(!modal) modal = 0;
  let barang = {nama, modal, harga, stok};
  if(editIndex == -1){
    data.push(barang);
  } else {
    data[editIndex] = barang;
  }
  localStorage.setItem('toko_bilal', JSON.stringify(data));
  batalEdit();
  tampil();
}

function editBarang(i){
  let d = data[i];
  document.getElementById('nama').value = d.nama;
  document.getElementById('modal').value = d.modal || '';
  document.getElementById('harga').value = d.harga;
  document.getElementById('stok').value = d.stok;
  document.getElementById('editIndex').value = i;
  document.getElementById('btnSimpan').innerText = 'UPDATE BARANG';
  document.getElementById('btnBatal').style.display = 'block';
  window.scrollTo(0,0);
}

function batalEdit(){
  document.getElementById('nama').value='';
  document.getElementById('modal').value='';
  document.getElementById('harga').value='';
  document.getElementById('stok').value='';
  document.getElementById('editIndex').value = -1;
  document.getElementById('btnSimpan').innerText = 'SIMPAN';
  document.getElementById('btnBatal').style.display = 'none';
}

function hapus(i){
  if(!confirm('Hapus barang ini?')) return;
  data.splice(i,1);
  localStorage.setItem('toko_bilal', JSON.stringify(data));
  tampil();
}

function tampil(){
  let cari = document.getElementById('cari').value.toLowerCase();
  let html = '';
  let hitung = 0;
  let totalUntung = 0;
  data.forEach((d,i)=>{
    if(d.nama.toLowerCase().includes(cari)){
      let modal = Number(d.modal || 0);
      let jual = Number(d.harga);
      let untung = jual - modal;
      totalUntung += untung * Number(d.stok);
      html += `<tr><td>${d.nama}</td><td>Rp ${modal.toLocaleString('id-ID')}</td><td>Rp ${jual.toLocaleString('id-ID')}</td><td>Rp ${untung.toLocaleString('id-ID')}</td><td>${d.stok}</td><td><button class="edit" onclick="editBarang(${i})">Edit</button><button class="hapus" onclick="hapus(${i})">Hapus</button></td></tr>`;
      hitung++;
    }
  });
  document.getElementById('tabel').innerHTML = html;
  document.getElementById('total').innerText = hitung;
  document.getElementById('totalUntung').innerText = 'Rp ' + totalUntung.toLocaleString('id-ID');
}
tampil();
