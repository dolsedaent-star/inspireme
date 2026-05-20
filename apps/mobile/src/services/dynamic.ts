/**
 * Runtime figure generation.
 *
 * When the prebuilt pool is exhausted (every candidate already generated, or
 * every generated figure already viewed), the client picks an un-generated
 * candidate from `figure_candidates`, asks Gemini to write the figure, mirrors
 * the Wikipedia portrait into Supabase Storage, upserts the row, and returns
 * a Figure ready to render.
 *
 * Until launch this calls Gemini directly with the public API key. Before
 * launch, move this into a Supabase Edge Function so the key stays
 * server-side and an ad-unlock counter can gate the call.
 */

import type { Figure, FigureCategory, FigureData, FigureSources, TimelineEvent } from '../shared';
import { getSupabase, isSupabaseConfigured } from './supabase';

const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const WIKI_UA =
  'InspireMe/0.1 (https://github.com/dolsedaent-star/inspireme; dolsedaent@gmail.com)';

export type Candidate = {
  slug: string;
  name_en: string;
  name_ko: string | null;
  categories: string[];
};

const VALID_STAGES = new Set([
  'childhood',
  'teens',
  'twenties',
  'thirties',
  'forties',
  'fifties',
  'later',
]);

const VALID_CATEGORIES = new Set([
  'failure',
  'challenge',
  'success',
  'turning_point',
  'later_years',
]);

// ─────────────────────────────────────────────────────────────
// Candidate picking
// ─────────────────────────────────────────────────────────────

export async function pickNextCandidate(
  excludeFigureIds: string[] = [],
): Promise<Candidate | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabase();

  const { data: candidates, error: cErr } = await sb
    .from('figure_candidates')
    .select('slug, name_en, name_ko, categories');
  if (cErr || !candidates?.length) return null;

  const { data: figures } = await sb.from('figures').select('slug, id');
  const existing = new Set((figures ?? []).map((f) => f.slug));
  const excludedSlugs = new Set(
    (figures ?? []).filter((f) => excludeFigureIds.includes(f.id)).map((f) => f.slug),
  );

  // Prefer fully new (not in figures yet)
  const fresh = candidates.filter((c) => !existing.has(c.slug));
  if (fresh.length > 0) {
    return fresh[Math.floor(Math.random() * fresh.length)] as Candidate;
  }

  // Otherwise pick existing-but-not-viewed
  const reusable = candidates.filter((c) => !excludedSlugs.has(c.slug));
  if (reusable.length > 0) {
    return reusable[Math.floor(Math.random() * reusable.length)] as Candidate;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Wikipedia lookup (best-effort)
// ─────────────────────────────────────────────────────────────

interface WikiInfo {
  summary?: string;
  image_url?: string;
  image_credit?: string;
  birth_year?: number;
  death_year?: number | null;
  wikipedia_ko?: string;
  wikipedia_en?: string;
}

async function fetchWikiSummary(title: string, lang: 'ko' | 'en'): Promise<{
  extract?: string;
  image?: string;
  page?: string;
} | null> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': WIKI_UA } },
    );
    if (!res.ok) return null;
    const json: any = await res.json();
    return {
      extract: json.extract,
      image: json.originalimage?.source || json.thumbnail?.source,
      page: json.content_urls?.desktop?.page,
    };
  } catch {
    return null;
  }
}

function parseYears(extract: string | undefined) {
  if (!extract) return {};
  const m = extract.match(/\((?:born\s+)?(\d{3,4})[^\d]+(\d{3,4})?\)/);
  if (!m) return {};
  return {
    birth_year: Number(m[1]),
    death_year: m[2] ? Number(m[2]) : null,
  };
}

async function lookupWiki(name_en: string, name_ko: string | null): Promise<WikiInfo> {
  const [ko, en] = await Promise.all([
    name_ko ? fetchWikiSummary(name_ko, 'ko') : Promise.resolve(null),
    fetchWikiSummary(name_en, 'en'),
  ]);
  const summary = ko?.extract || en?.extract;
  const years = parseYears(en?.extract || ko?.extract);
  return {
    summary,
    image_url: en?.image || ko?.image,
    image_credit: en?.page || ko?.page,
    wikipedia_ko: ko?.page,
    wikipedia_en: en?.page,
    ...years,
  };
}

// ─────────────────────────────────────────────────────────────
// Image mirror to Supabase Storage
// ─────────────────────────────────────────────────────────────

async function mirrorImage(slug: string, sourceUrl: string | undefined): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    const res = await fetch(sourceUrl, { headers: { 'User-Agent': WIKI_UA } });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? 'image/jpeg';
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const blob = await res.blob();

    const sb = getSupabase();
    const path = `${slug}.${ext}`;
    const { error } = await sb.storage
      .from('figure-images')
      .upload(path, blob, { contentType: ct, upsert: true });
    if (error) return null;
    const { data } = sb.storage.from('figure-images').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Gemini prompt + call
// ─────────────────────────────────────────────────────────────

function buildPrompt(c: Candidate, wiki: WikiInfo): string {
  const lifespan =
    wiki.birth_year && wiki.death_year
      ? `${wiki.birth_year}–${wiki.death_year} (${wiki.death_year - wiki.birth_year}세)`
      : wiki.birth_year
        ? `${wiki.birth_year} 출생`
        : '연도 미상';
  const wikiBlock = wiki.summary ? `\n참고 (Wikipedia 요약):\n${wiki.summary}\n` : '';
  return `너는 한국어로 "InspireMe"라는 동기부여 앱을 위한 GQ 매거진 톤의 위인 일대기 데이터를 생성한다.
대상 인물: ${c.name_ko ?? c.name_en} (${c.name_en}), ${lifespan}
분야: ${c.categories.join(', ')}
${wikiBlock}
규칙:
- timeline은 정확히 10~12개의 이벤트. 각 나이대(childhood/teens/twenties/thirties/forties/fifties/later)에 최소 1개씩 분포.
- 각 event의 category는 다음 중 하나: failure, challenge, success, turning_point, later_years
- keywords는 정확히 5개의 한국어 키워드 (각 1~6자).
- life_curve는 5~6개의 (age, value, label_ko) 점. value는 -1.0~+1.0.
- insights_ko는 정확히 3개. 따뜻한 통찰 1~2문장씩.
- comparison_ko는 "X는 N세에 ...했다" 형태의 한 문장.
- today_question_ko는 사용자가 오늘 자기 자신에게 물어볼 한 문장.
- image_prompt는 표지를 위한 영어 1문장.
- epilogue_ko는 4~6문장 — 말년·죽음·마지막 순간 (행복·외로움 솔직하게, 불명확하면 "전해진 바로는…").

응답은 **순수 JSON 객체만** 반환. 코드 펜스 없이. 필드:
quote_ko, quote_en, summary_ko, keywords, failure_event, success_event, timeline, life_curve, legacy_ko, epilogue_ko, insights_ko, comparison_ko, today_question_ko, image_prompt

이벤트 객체: { age, year, stage, category, title_ko, title_en, description_ko } 7개 필드 모두.
곡선 객체: { age, value, label_ko } 3개 필드.`;
}

async function callGemini(prompt: string): Promise<unknown> {
  if (!GEMINI_KEY) throw new Error('Gemini API key missing');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const text: string | undefined = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return JSON.parse(text);
}

// ─────────────────────────────────────────────────────────────
// Normalize / minimal validate
// ─────────────────────────────────────────────────────────────

function normalizeStage(v: unknown): TimelineEvent['stage'] {
  const s = String(v ?? '');
  if (s === 'later_years' || s === 'old_age') return 'later';
  if (VALID_STAGES.has(s)) return s as TimelineEvent['stage'];
  return 'later';
}

function normalizeCategory(v: unknown): TimelineEvent['category'] {
  const s = String(v ?? '');
  if (VALID_CATEGORIES.has(s)) return s as TimelineEvent['category'];
  return 'challenge';
}

function normalizeEvent(raw: any): TimelineEvent | null {
  if (!raw || typeof raw.age !== 'number') return null;
  return {
    age: raw.age,
    year: typeof raw.year === 'number' ? raw.year : 0,
    stage: normalizeStage(raw.stage),
    category: normalizeCategory(raw.category),
    title_ko: String(raw.title_ko ?? ''),
    title_en: String(raw.title_en ?? ''),
    description_ko: String(raw.description_ko ?? ''),
  };
}

function normalizeData(raw: any): FigureData | null {
  if (!raw || typeof raw !== 'object') return null;

  const timeline: TimelineEvent[] = Array.isArray(raw.timeline)
    ? (raw.timeline as unknown[])
        .map((e) => normalizeEvent(e))
        .filter((e): e is TimelineEvent => e !== null)
    : [];
  if (timeline.length < 6) return null;

  const life_curve = Array.isArray(raw.life_curve)
    ? raw.life_curve
        .filter((p: any) => typeof p?.age === 'number' && typeof p?.value === 'number')
        .map((p: any) => ({
          age: p.age,
          value: Math.max(-1, Math.min(1, p.value)),
          label_ko: String(p.label_ko ?? ''),
        }))
    : [];
  if (life_curve.length < 3) return null;

  const failure_event =
    normalizeEvent(raw.failure_event) ??
    timeline.find((e: TimelineEvent) => e.category === 'failure') ??
    timeline.find((e: TimelineEvent) => e.category === 'challenge') ??
    timeline[0];
  const success_event =
    normalizeEvent(raw.success_event) ??
    timeline.find((e: TimelineEvent) => e.category === 'success') ??
    timeline.find((e: TimelineEvent) => e.category === 'turning_point') ??
    timeline[timeline.length - 1];

  const keywordsArr: string[] = Array.isArray(raw.keywords)
    ? raw.keywords.map((k: any) => String(k)).slice(0, 5)
    : [];
  while (keywordsArr.length < 5) keywordsArr.push('—');

  const insightsArr: string[] = Array.isArray(raw.insights_ko)
    ? raw.insights_ko.map((i: any) => String(i)).slice(0, 3)
    : [];
  while (insightsArr.length < 3) insightsArr.push('');

  return {
    quote_ko: String(raw.quote_ko ?? ''),
    quote_en: String(raw.quote_en ?? ''),
    summary_ko: String(raw.summary_ko ?? ''),
    keywords: keywordsArr as [string, string, string, string, string],
    failure_event,
    success_event,
    timeline,
    life_curve,
    legacy_ko: String(raw.legacy_ko ?? ''),
    epilogue_ko: raw.epilogue_ko ? String(raw.epilogue_ko) : undefined,
    insights_ko: insightsArr as [string, string, string],
    comparison_ko: String(raw.comparison_ko ?? ''),
    today_question_ko: String(raw.today_question_ko ?? ''),
    image_prompt: String(raw.image_prompt ?? ''),
  };
}

// ─────────────────────────────────────────────────────────────
// Top-level: generate + cache + return Figure
// ─────────────────────────────────────────────────────────────

export async function generateAndCacheFigure(c: Candidate): Promise<Figure | null> {
  const wiki = await lookupWiki(c.name_en, c.name_ko);
  const prompt = buildPrompt(c, wiki);

  let raw: unknown;
  try {
    raw = await callGemini(prompt);
  } catch (e) {
    console.log('[dynamic] Gemini call failed:', e instanceof Error ? e.message : e);
    return null;
  }

  const data = normalizeData(raw);
  if (!data) {
    console.log('[dynamic] schema normalization failed for', c.slug);
    return null;
  }

  const imageUrl = await mirrorImage(c.slug, wiki.image_url);

  const sb = getSupabase();
  const era =
    wiki.birth_year && wiki.birth_year >= 1900
      ? '근현대'
      : wiki.birth_year && wiki.birth_year >= 1500
        ? '근세'
        : wiki.birth_year
          ? '근대 이전'
          : null;

  const { data: row, error } = await sb
    .from('figures')
    .upsert(
      {
        slug: c.slug,
        name: c.name_en,
        korean_name: c.name_ko,
        title: c.categories[0] ?? null,
        era,
        country: null,
        birth_year: wiki.birth_year ?? null,
        death_year: wiki.death_year ?? null,
        fields: c.categories,
        keywords: data.keywords,
        data,
        image_url: imageUrl,
        image_credit: wiki.image_credit ?? null,
        source: 'runtime',
      },
      { onConflict: 'slug' },
    )
    .select('*')
    .maybeSingle();
  if (error || !row) {
    console.log('[dynamic] upsert failed:', error?.message);
    return null;
  }

  const sources: FigureSources = {
    wikipedia_ko: wiki.wikipedia_ko,
    wikipedia_en: wiki.wikipedia_en,
    image_credit: wiki.image_credit,
    generated_by: GEMINI_MODEL,
    generated_at: new Date().toISOString(),
  };

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
    sources,
    data,
  };
}
