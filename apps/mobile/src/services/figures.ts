import type { Figure, FigureCategory, FigureData, FigureSources } from '../shared';
import { mockFigures } from '../data/mockFigures';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { generateAndCacheFigure, pickNextCandidate } from './dynamic';

type FigureRow = {
  id: string;
  slug: string;
  name: string;
  korean_name: string | null;
  title: string | null;
  era: string | null;
  country: string | null;
  birth_year: number | null;
  death_year: number | null;
  fields: string[] | null;
  keywords: string[] | null;
  data: FigureData;
  image_url: string | null;
  image_credit: string | null;
  sources: FigureSources | null;
};

function rowToFigure(row: FigureRow): Figure {
  // Synthesize Wikipedia URLs from name so we always have a citation, even
  // for figures whose generator run pre-dated the sources column.
  const wikiKo = `https://ko.wikipedia.org/wiki/${encodeURIComponent(row.korean_name ?? row.name)}`;
  const wikiEn = `https://en.wikipedia.org/wiki/${encodeURIComponent(row.name.replace(/ /g, '_'))}`;
  return {
    id: row.id,
    name_ko: row.korean_name ?? row.name,
    name_en: row.name,
    era: row.era ?? '',
    birth_year: row.birth_year ?? 0,
    death_year: row.death_year,
    country: row.country ?? '',
    categories: (row.fields ?? []) as FigureCategory[],
    cover_image_url: row.image_url,
    image_credit: row.image_credit,
    sources: {
      wikipedia_ko: row.sources?.wikipedia_ko ?? wikiKo,
      wikipedia_en: row.sources?.wikipedia_en ?? wikiEn,
      image_credit: row.sources?.image_credit ?? row.image_credit ?? undefined,
      generated_by: row.sources?.generated_by,
      generated_at: row.sources?.generated_at,
    },
    data: row.data,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Three picks for the Daily screen.
 *
 * Test-mode behavior:
 * - always returns a fresh random sample from the figure pool (no daily_picks row)
 * - `exclude` skips figures already shown / viewed
 * - if the remaining pool can't fill `count`, dynamically generates new figures
 *   from `figure_candidates` (Gemini + Wiki + Storage upload) and caches them
 *   so every future user sees the new entry too.
 */
export async function loadDailyFigures(opts: { exclude?: string[]; count?: number } = {}): Promise<Figure[]> {
  const count = opts.count ?? 3;
  const exclude = new Set(opts.exclude ?? []);

  if (!isSupabaseConfigured) {
    return shuffle(mockFigures.filter((f) => !exclude.has(f.id))).slice(0, count);
  }

  const sb = getSupabase();
  const { data: rows, error } = await sb.from('figures').select('*');
  if (error) throw error;

  const pool = (rows ?? []).filter((r) => !exclude.has(r.id));
  const picked = shuffle(pool).slice(0, count).map(rowToFigure);

  // Pool can't fill the slot — try to dynamically generate the missing ones.
  if (picked.length < count) {
    const needed = count - picked.length;
    const used = new Set([...exclude, ...picked.map((f) => f.id)]);
    for (let i = 0; i < needed; i++) {
      const candidate = await pickNextCandidate(Array.from(used));
      if (!candidate) break;
      const generated = await generateAndCacheFigure(candidate);
      if (!generated) break;
      picked.push(generated);
      used.add(generated.id);
    }
  }

  if (picked.length === 0) return mockFigures.slice(0, count);
  return picked;
}

export async function loadFigureById(id: string): Promise<Figure | null> {
  if (!isSupabaseConfigured) {
    return mockFigures.find((f) => f.id === id) ?? null;
  }
  const sb = getSupabase();
  const { data, error } = await sb.from('figures').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToFigure(data) : null;
}
