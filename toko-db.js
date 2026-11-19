const endpoint = 'https://dtnnmyhqajjonrdroilp.supabase.co';
const publishableKey = 'sb_publishable_oXJDmTUAiNoNpVh8R31ZUQ_FykFUQUS';
const db = supabase.createClient(endpoint, publishableKey);

async function hasil(request) {
  const {data, error} = await request;
  if (error) throw new Error(error.message);
  return data;
}

async function semua(table, order) {
  const rows = [];
  for (;;) {
    const page = await hasil(db.from(table).select('*').order(order)
      .range(rows.length, rows.length + 99));
    rows.push(...page);
    if (!page.length) return rows;
  }
}

async function masuk(email, password) {
  await hasil(db.auth.signInWithPassword({email, password}));
  if (!await hasil(db.rpc('admin_toko'))) {
    await db.auth.signOut();
    throw new Error('Akun ini belum memiliki akses admin toko.');
  }
}

function pantauAdmin(onChange, onError) {
  let version = 0;
  let current;
  db.auth.onAuthStateChange((event, session) => {
    const id = session?.user.id ?? null;
    if (id === current && event !== 'INITIAL_SESSION') return;
    current = id;
    const ticket = ++version;
    setTimeout(async () => {
      try {
        const allowed = id ? await hasil(db.rpc('admin_toko')) : false;
        if (ticket === version) await onChange(allowed);
      } catch (err) {
        if (ticket === version) { current = undefined; await onChange(false); onError(err); }
      }
    }, 0);
  });
}
