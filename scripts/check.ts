import { sb } from './lib/supabase.js';

const { data, error } = await sb
  .from('figures')
  .select('slug, korean_name, image_url')
  .order('slug');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Total figures: ${data?.length}`);
for (const r of data ?? []) {
  const tag = r.image_url ? 'IMG' : '---';
  const url = r.image_url ?? '';
  console.log(`${tag} ${(r.korean_name ?? r.slug).padEnd(20)} ${url}`);
}
