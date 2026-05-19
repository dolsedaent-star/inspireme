/**
 * Minimal Wikipedia helper: pull a summary + lead image for a person.
 * Best-effort — failures fall through with `undefined` fields so generation can
 * still continue (Gemini will rely on its own knowledge).
 */

export interface WikiInfo {
  summary?: string;
  image_url?: string;
  image_credit?: string;
  birth_year?: number;
  death_year?: number | null;
}

async function fetchSummary(title: string, lang: 'ko' | 'en'): Promise<WikiInfo | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'InspireMe-Generator/0.1 (dolsedaent@gmail.com)' },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    extract?: string;
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
    content_urls?: { desktop?: { page?: string } };
  };

  return {
    summary: json.extract,
    image_url: json.originalimage?.source || json.thumbnail?.source,
    image_credit: json.content_urls?.desktop?.page,
  };
}

function parseYearsFromExtract(extract: string | undefined): {
  birth_year?: number;
  death_year?: number | null;
} {
  if (!extract) return {};
  const m = extract.match(/\((?:born\s+)?(\d{3,4})[^\d]+(\d{3,4})?\)/);
  if (!m) return {};
  return {
    birth_year: Number(m[1]),
    death_year: m[2] ? Number(m[2]) : null,
  };
}

export async function lookupFigure(name_en: string, name_ko?: string): Promise<WikiInfo> {
  const ko = name_ko ? await fetchSummary(name_ko, 'ko') : null;
  const en = await fetchSummary(name_en, 'en');
  const summary = ko?.summary || en?.summary;
  const image_url = en?.image_url || ko?.image_url; // Wikipedia EN tends to have higher-res leads
  const image_credit = en?.image_credit || ko?.image_credit;
  const years = parseYearsFromExtract(en?.summary || ko?.summary);
  return { summary, image_url, image_credit, ...years };
}
