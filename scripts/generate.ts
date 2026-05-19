/**
 * InspireMe content generator.
 *
 *   npm run generate            — generate + upsert any rows missing from `figures`
 *   npm run generate:dry        — print what would be generated; no DB writes
 *
 * Reads scripts/names.csv (slug, name_en, name_ko, categories[|-separated]).
 * For each row missing in Supabase: Wikipedia lookup → Gemini JSON →
 * zod validate → upsert into figures with image_url.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from './lib/env.js';
import { sb, figureExists } from './lib/supabase.js';
import { lookupFigure } from './lib/wikimedia.js';
import { buildPrompt } from './lib/prompt.js';
import { generateFigure } from './lib/gemini.js';

const dry = process.argv.includes('--dry');
const onlyFlag = process.argv.find((a) => a.startsWith('--only='));
const only = onlyFlag ? onlyFlag.slice('--only='.length).split(',') : null;

type Row = { slug: string; name_en: string; name_ko: string; categories: string[] };

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
      };
    });
}

async function processRow(row: Row, idx: number, total: number): Promise<'created' | 'skipped' | 'failed'> {
  const tag = `[${String(idx + 1).padStart(2, '0')}/${total}] ${row.slug.padEnd(22)}`;

  try {
    if (!dry && (await figureExists(row.slug))) {
      console.log(`${tag} ⚪ already exists, skipping`);
      return 'skipped';
    }

    console.log(`${tag} → fetching Wikipedia…`);
    const wiki = await lookupFigure(row.name_en, row.name_ko);

    console.log(`${tag} → asking Gemini (${env.geminiModel})…`);
    const prompt = buildPrompt({
      name_en: row.name_en,
      name_ko: row.name_ko,
      categories: row.categories,
      wiki_summary: wiki.summary,
      birth_year: wiki.birth_year,
      death_year: wiki.death_year,
    });
    const data = await generateFigure(prompt);

    if (dry) {
      console.log(`${tag} ✓ dry — ${data.timeline.length} events, ${data.life_curve.length} curve points`);
      return 'created';
    }

    const { error } = await sb.from('figures').upsert(
      {
        slug: row.slug,
        name: row.name_en,
        korean_name: row.name_ko,
        title: row.categories[0] ?? null,
        era: wiki.birth_year && wiki.birth_year >= 1900 ? '근현대' : wiki.birth_year && wiki.birth_year >= 1500 ? '근세' : '근대 이전',
        country: null,
        birth_year: wiki.birth_year ?? null,
        death_year: wiki.death_year ?? null,
        fields: row.categories,
        keywords: data.keywords,
        data,
        image_url: wiki.image_url ?? null,
        image_credit: wiki.image_credit ?? null,
        source: 'prebuilt',
      },
      { onConflict: 'slug' },
    );
    if (error) throw error;

    console.log(`${tag} ✓ upserted (${wiki.image_url ? 'with image' : 'no image'})`);
    return 'created';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`${tag} ✗`);
    console.log(msg.split('\n').map((l) => `    ${l}`).join('\n'));
    return 'failed';
  }
}

async function main() {
  const allRows = loadCsv();
  const rows = only ? allRows.filter((r) => only.includes(r.slug)) : allRows;
  if (rows.length === 0) {
    console.error(`No rows to process. only=${only?.join(',') ?? '(none)'}`);
    process.exit(1);
  }

  console.log(`InspireMe generator — model=${env.geminiModel} dry=${dry} rows=${rows.length}\n`);

  const counts = { created: 0, skipped: 0, failed: 0 };
  for (let i = 0; i < rows.length; i++) {
    const result = await processRow(rows[i], i, rows.length);
    counts[result]++;
    // Free-tier Gemini is 20 RPM. Sleep ~3.5s between requests to stay under.
    if (i < rows.length - 1 && result !== 'skipped') {
      await new Promise<void>((r) => setTimeout(r, 3500));
    }
  }

  console.log(`\nDone. created=${counts.created} skipped=${counts.skipped} failed=${counts.failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
