/**
 * One-shot: re-host every figure's `image_url` into Supabase Storage so the
 * mobile client doesn't depend on Wikimedia's User-Agent policy.
 *
 *   npm run mirror-images
 *
 * Idempotent — re-running just re-uploads (upsert: true).
 */

import { sb } from './lib/supabase.js';
import { mirrorImage } from './lib/storage.js';

const onlyFlag = process.argv.find((a) => a.startsWith('--only='));
const only = onlyFlag ? onlyFlag.slice('--only='.length).split(',') : null;

const { data: rows, error } = await sb
  .from('figures')
  .select('id, slug, image_url')
  .order('slug');

if (error) {
  console.error(error);
  process.exit(1);
}

const targets = (rows ?? []).filter((r) => (only ? only.includes(r.slug) : true));
console.log(`Mirroring ${targets.length} figures…\n`);

let ok = 0;
let fail = 0;
let skip = 0;
for (let i = 0; i < targets.length; i++) {
  const r = targets[i];
  const tag = `[${String(i + 1).padStart(2, '0')}/${targets.length}] ${r.slug.padEnd(22)}`;
  try {
    if (!r.image_url) {
      console.log(`${tag} ⚪ no source url, skipping`);
      skip++;
      continue;
    }
    if (r.image_url.includes('/storage/v1/object/public/figure-images/')) {
      console.log(`${tag} ⚪ already mirrored, skipping`);
      skip++;
      continue;
    }
    const newUrl = await mirrorImage(r.slug, r.image_url);
    if (!newUrl) throw new Error('no url returned');
    const { error: upErr } = await sb.from('figures').update({ image_url: newUrl }).eq('id', r.id);
    if (upErr) throw upErr;
    console.log(`${tag} ✓ mirrored`);
    ok++;
  } catch (e) {
    console.log(`${tag} ✗ ${e instanceof Error ? e.message : String(e)}`);
    fail++;
  }
}

console.log(`\nDone. ok=${ok} skipped=${skip} failed=${fail}`);
