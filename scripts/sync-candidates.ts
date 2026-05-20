/**
 * Sync scripts/names.csv into the `figure_candidates` table.
 * Idempotent — re-running adds new rows and updates existing ones (by slug).
 *
 *   npm run sync-candidates
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sb } from './lib/supabase.js';

type Row = {
  slug: string;
  name_en: string;
  name_ko: string;
  categories: string[];
  country: string | null;
  deceased: boolean;
};

function loadCsv(): Row[] {
  const csv = readFileSync(resolve(import.meta.dirname, 'names.csv'), 'utf8').trim();
  const [header, ...lines] = csv.split(/\r?\n/);
  const cols = header.split(',');
  return lines
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const cells = line.split(',');
      const rec: Record<string, string> = {};
      cols.forEach((c, i) => (rec[c] = (cells[i] ?? '').trim()));
      return {
        slug: rec.slug,
        name_en: rec.name_en,
        name_ko: rec.name_ko,
        categories: rec.categories.split('|').filter(Boolean),
        country: rec.country || null,
        deceased: rec.deceased !== 'false',
      };
    });
}

const rows = loadCsv();
console.log(`Syncing ${rows.length} candidates…`);
const living = rows.filter((r) => !r.deceased).map((r) => r.slug);
if (living.length) console.log(`Skipping living people: ${living.join(', ')}`);

const { error } = await sb.from('figure_candidates').upsert(
  rows.map((r) => ({
    slug: r.slug,
    name_en: r.name_en,
    name_ko: r.name_ko,
    categories: r.categories,
    country: r.country,
    deceased: r.deceased,
  })),
  { onConflict: 'slug' },
);
if (error) {
  console.error(error);
  process.exit(1);
}

const { count: total } = await sb
  .from('figure_candidates')
  .select('*', { count: 'exact', head: true });
const { count: generated } = await sb
  .from('figures')
  .select('*', { count: 'exact', head: true });
console.log(`\n✓ ${rows.length} candidates upserted.`);
console.log(`Pool status: ${generated}/${total} figures generated.`);
