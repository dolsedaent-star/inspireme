import { sb } from './lib/supabase.js';

// Remove any runtime-generated figure that's missing an image so it can be
// regenerated cleanly after the storage policy is in place.
const { data } = await sb
  .from('figures')
  .select('id, slug, image_url, source')
  .eq('source', 'runtime');

for (const f of data ?? []) {
  if (!f.image_url) {
    const { error } = await sb.from('figures').delete().eq('id', f.id);
    console.log(error ? `fail ${f.slug}: ${error.message}` : `deleted ${f.slug}`);
  }
}
console.log('done');
