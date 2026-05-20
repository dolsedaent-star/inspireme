import { sb } from './lib/supabase.js';

const { data, error } = await sb
  .from('figures')
  .select('slug, image_url, source, korean_name')
  .order('updated_at', { ascending: false });

if (error) { console.error(error); process.exit(1); }
for (const r of data ?? []) {
  console.log(
    `[${r.source}] ${r.slug.padEnd(22)} ${r.image_url ? 'IMG' : '---'} ${r.korean_name ?? ''}`,
  );
}
