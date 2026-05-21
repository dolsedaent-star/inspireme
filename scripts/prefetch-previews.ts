/**
 * Prefetch preview data for every candidate without invoking Gemini.
 *
 *   npm run prefetch-previews
 *
 * For each row in figure_candidates that's missing image_url or preview_ko,
 * we fetch the Wikipedia summary (ko first, then en) and mirror the lead
 * photo into Supabase Storage. Cost: ~zero (Wikipedia is free).
 */

import { sb } from './lib/supabase.js';
import { lookupFigure } from './lib/wikimedia.js';

const WIKI_UA =
  'InspireMe/0.1 (https://github.com/dolsedaent-star/inspireme; dolsedaent@gmail.com)';
const BUCKET = 'figure-images';

function clipPreview(s: string | undefined): string | null {
  if (!s) return null;
  // First sentence in Korean text, or first ~120 chars.
  const sentences = s.split(/(?<=[.!?。!?])\s+/);
  const first = sentences[0] ?? s;
  return first.length > 130 ? first.slice(0, 130).trim() + '…' : first.trim();
}

async function mirrorImage(slug: string, sourceUrl: string | undefined): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    const res = await fetch(sourceUrl, { headers: { 'User-Agent': WIKI_UA } });
    if (!res.ok) {
      console.log(`  ✗ image fetch ${slug}: HTTP ${res.status}`);
      return null;
    }
    const ct = res.headers.get('content-type') ?? 'image/jpeg';
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `${slug}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
    if (error) {
      console.log(`  ✗ image upload ${slug}: ${error.message}`);
      return null;
    }
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.log(`  ✗ image exc ${slug}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

const onlyFlag = process.argv.find((a) => a.startsWith('--only='));
const only = onlyFlag ? onlyFlag.slice('--only='.length).split(',') : null;
const force = process.argv.includes('--force');

const { data: rows, error } = await sb
  .from('figure_candidates')
  .select('slug, name_en, name_ko, image_url, preview_ko');
if (error) {
  console.error(error);
  process.exit(1);
}

const targets = (rows ?? []).filter((r) => {
  if (only && !only.includes(r.slug)) return false;
  if (force) return true;
  return !r.image_url || !r.preview_ko;
});

console.log(`Prefetching previews for ${targets.length} / ${rows?.length} candidates…\n`);

let okCount = 0;
let failCount = 0;
let skipCount = 0;

for (let i = 0; i < targets.length; i++) {
  const r = targets[i];
  const tag = `[${String(i + 1).padStart(3, '0')}/${targets.length}] ${r.slug.padEnd(22)}`;
  try {
    const wiki = await lookupFigure(r.name_en, r.name_ko);
    if (!wiki.summary && !wiki.image_url) {
      console.log(`${tag} ⚪ no wiki data, skipping`);
      skipCount++;
      continue;
    }
    const previewKo = clipPreview(wiki.summary);
    const imageUrl = await mirrorImage(r.slug, wiki.image_url);

    const { error: upErr } = await sb
      .from('figure_candidates')
      .update({
        image_url: imageUrl ?? r.image_url ?? null,
        image_credit: wiki.image_credit ?? null,
        preview_ko: previewKo ?? r.preview_ko ?? null,
      })
      .eq('slug', r.slug);
    if (upErr) throw upErr;
    console.log(`${tag} ✓ ${imageUrl ? 'IMG' : '---'} ${previewKo ? 'PREV' : '----'}`);
    okCount++;
  } catch (e) {
    console.log(`${tag} ✗ ${e instanceof Error ? e.message : e}`);
    failCount++;
  }
  // Be polite to Wikipedia.
  await new Promise<void>((r) => setTimeout(r, 250));
}

console.log(`\nDone. ok=${okCount} skipped=${skipCount} failed=${failCount}`);
