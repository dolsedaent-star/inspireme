import { sb } from './lib/supabase.js';

const { data } = await sb.from('figures').select('slug, source, image_url').eq('source', 'runtime');
console.log('runtime figures:', data?.length);
for (const f of data ?? []) {
  const u = f.image_url ?? 'null';
  console.log(`  ${f.slug.padEnd(20)} ${u.slice(0, 80)}`);
}
