import { sb } from './lib/supabase.js';

const { data, error } = await sb.storage.from('figure-images').list('', {
  limit: 100,
  sortBy: { column: 'created_at', order: 'desc' },
});
if (error) { console.error(error); process.exit(1); }
console.log(`Total objects: ${data?.length}\n`);
for (const f of data ?? []) {
  const size = f.metadata?.size ? `${Math.round(f.metadata.size / 1024)}KB` : '?';
  console.log(`  ${f.created_at}  ${f.name.padEnd(30)} ${size}`);
}
