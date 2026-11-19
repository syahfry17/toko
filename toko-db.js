const endpoint = 'https://dtnnmyhqajjonrdroilp.supabase.co';
const publishableKey = 'sb_publishable_oXJDmTUAiNoNpVh8R31ZUQ_FykFUQUS';
// BENERIN: pakai window.db, bukan const db. Kalau pakai const, script.js yang jalan duluan kena 'Cannot access db before initialization'.
window.db = supabase.createClient(endpoint, publishableKey);

async function hasil(request) {
  const {data, error} = await request;
  if (error) throw new Error(error.message);
  return data;
}

async function semua(table, order) {
  const rows = [];
  for (;;) {
    const page = await hasil(window.db.from(table).select('*').order(order)
      .range(rows.length, rows.length + 99));
    rows.push(...page);
    if (!page.length) return rows;
  }
}

async function masuk(email, password) {
  await hasil(window.db.auth.signInWithPassword({email, password}));
  if (!await hasil(window.db.rpc('admin_toko'))) {
    await window.db.auth.signOut();
    throw new Error('Akun ini belum memiliki akses admin toko.');
  }
}

function pantauAdmin(onChange, onError) {
  let version = 0;
  let current;
  window.db.auth.onAuthStateChange((event, session) => {
    const id = session?.user.id ?? null;
    if (id === current && event !== 'INITIAL_SESSION') return;
    current = id;
    const ticket = ++version;
    setTimeout(async () => {
      try {
        const allowed = id ? await hasil(window.db.rpc('admin_toko')) : false;
        if (ticket === version) await onChange(allowed);
      } catch (err) {
        if (ticket === version) { current = undefined; await onChange(false); onError(err); }
      }
    }, 0);
  });
}

// ===== BARU: LANGKAH 1 - UPLOAD FOTO KE STORAGE =====
// Tugasnya cuma 1: terima file foto, upload ke bucket 'foto-produk',
// lalu kembalikan LINK-nya. Link inilah yang nanti disimpan ke database.

async function uploadFoto(file, namaFile) {
  // file = foto dari input, sudah dikompres jadi kecil
  // namaFile = contoh: 'beras-171234567890.jpg'
  const { error } = await window.db.storage
    .from('foto-produk')
    .upload(namaFile, file, {
      cacheControl: '3600',
      upsert: false
    });
  if (error) throw new Error(error.message);

  const { data } = window.db.storage
    .from('foto-produk')
    .getPublicUrl(namaFile);

  return data.publicUrl;
}

// ===== BARU: HAPUS FOTO LAMA DARI STORAGE =====
// Dipakai pas produk dihapus / fotonya diganti, biar storage nggak penuh sampah.
// Inputnya LINK foto lama, contoh: 'https://.../foto-produk/beras-123.jpg'
// Kita ambil nama filenya aja: 'beras-123.jpg', lalu hapus.

async function hapusFoto(urlFoto) {
  if (!urlFoto || !urlFoto.includes('/foto-produk/')) return;
  const namaFile = urlFoto.split('/foto-produk/').pop().split('?')[0];
  if (!namaFile) return;
  await window.db.storage.from('foto-produk').remove([namaFile]);
}
