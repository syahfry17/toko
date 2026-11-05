let data = JSON.parse(localStorage.getItem('toko_bilal') || '[]');

function simpan(){
  let nama = document.getElementById('nama').value;
  let harga = document.getElementById('harga').value;
  let stok = document.getElementById('stok').value;
  if(!nama || !harga || !stok) return alert('Isi semua dulu bang!');
  data.push({nama, harga, stok});
  localStorage.setItem('toko_bilal', JSON.stringify(data));
  document.getElementById('nama').value='';
  document.getElementById('harga').value='';
  document.getElementById('stok').value='';
  tampil();
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
  data.forEach((d,i)=>{
    if(d.nama.toLowerCase().includes(cari)){
      html += `<tr><td>${d.nama}</td><td>Rp ${Number(d.harga).toLocaleString('id-ID')}</td><td>${d.stok}</td><td><button class="hapus" onclick="hapus(${i})">Hapus</button></td></tr>`;
      hitung++;
    }
  });
  document.getElementById('tabel').innerHTML = html;
  document.getElementById('total').innerText = hitung;
}
tampil();
