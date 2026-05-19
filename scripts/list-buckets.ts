import { sb } from './lib/supabase.js';

const { data, error } = await sb.storage.listBuckets();
if (error) {
  console.error(error);
  process.exit(1);
}
console.log('Buckets:');
for (const b of data ?? []) {
  console.log(`  - ${b.name}  public=${b.public}  id=${b.id}`);
}

// Also try listing inside figure-images
const { data: files, error: lsErr } = await sb.storage.from('figure-images').list();
console.log('\nfigure-images contents (or error):');
if (lsErr) console.log('  err:', lsErr.message);
else for (const f of files ?? []) console.log(`  - ${f.name}`);
