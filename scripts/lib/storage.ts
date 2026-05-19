import { sb } from './supabase.js';

const WIKI_UA =
  'InspireMe/0.1 (https://github.com/dolsedaent-star/inspireme; dolsedaent@gmail.com)';

const BUCKET = 'figure-images';

function extFromContentType(ct: string | null): string {
  if (!ct) return 'jpg';
  if (ct.includes('jpeg')) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  return 'jpg';
}

/**
 * Fetch an image (with proper Wikimedia UA), upload to Supabase Storage at
 * `figure-images/<slug>.<ext>`, and return the public URL.
 * Returns null if the upstream fetch fails or no source url was given.
 */
export async function mirrorImage(
  slug: string,
  sourceUrl: string | undefined | null,
): Promise<string | null> {
  if (!sourceUrl) return null;
  const res = await fetch(sourceUrl, { headers: { 'User-Agent': WIKI_UA } });
  if (!res.ok) {
    throw new Error(`fetch ${sourceUrl} → HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type');
  const ext = extFromContentType(ct);
  const buf = Buffer.from(await res.arrayBuffer());

  const path = `${slug}.${ext}`;
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, {
    contentType: ct ?? 'image/jpeg',
    upsert: true,
  });
  if (upErr) throw new Error(`storage upload: ${upErr.message}`);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
