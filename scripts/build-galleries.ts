/**
 * Build full Korean galleries for every figure and save to figures.data.gallery.
 *
 *   npm run build-galleries
 *   npm run build-galleries -- --only=einstein,steve-jobs
 *   npm run build-galleries -- --force        # rewrite even if a gallery exists
 *
 * Pipeline per figure:
 *   1) Wikipedia media-list (ko first, en fallback) — image URLs + raw captions
 *   2) Discard logos / signatures / maps / cover dupes
 *   3) Gemini single batch: rewrite each caption in natural Korean OR mark
 *      SKIP if the photo isn't actually the figure (spouse, colleague, etc.)
 *   4) Save kept items to figures.data.gallery
 */

import { GoogleGenAI } from '@google/genai';
import { env } from './lib/env.js';
import { sb } from './lib/supabase.js';
import type { FigureData, GalleryItem } from '../apps/mobile/src/shared/types.js';

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
const WIKI_UA =
  'InspireMe/0.1 (https://github.com/dolsedaent-star/inspireme; dolsedaent@gmail.com)';

const onlyFlag = process.argv.find((a) => a.startsWith('--only='));
const only = onlyFlag ? onlyFlag.slice('--only='.length).split(',') : null;
const force = process.argv.includes('--force');

interface MediaPick {
  url: string;
  raw_caption: string;
}

async function fetchMediaList(title: string, lang: 'ko' | 'en'): Promise<any[]> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': WIKI_UA } },
    );
    if (!res.ok) return [];
    const json: any = await res.json();
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  }
}

function pickMedia(items: any[], coverUrl: string | undefined): MediaPick[] {
  const coverBase = coverUrl?.split('/').pop()?.toLowerCase() ?? '';
  return items
    .filter((i: any) => {
      if (i.type !== 'image' || !i.srcset?.length) return false;
      const t = String(i.title ?? '').toLowerCase();
      if (t.includes('logo') || t.includes('signature') || t.includes('symbol') || t.includes('map.'))
        return false;
      if (coverBase && t.includes(coverBase.replace(/^\d+px-/, ''))) return false;
      return true;
    })
    .slice(0, 6)
    .map((i: any) => {
      const last = (i.srcset ?? []).at(-1);
      const src: string | undefined = last?.src;
      if (!src) return null;
      const url = src.startsWith('//') ? `https:${src}` : src;
      const raw =
        i.caption?.text ??
        String(i.title ?? '')
          .replace(/^File:/, '')
          .replace(/\.\w+$/, '')
          .replace(/[_-]+/g, ' ');
      return { url, raw_caption: String(raw).trim().slice(0, 200) };
    })
    .filter((x): x is MediaPick => x !== null);
}

async function translateCaptions(personName: string, picks: MediaPick[]): Promise<(string | null)[]> {
  if (picks.length === 0) return [];
  const list = picks.map((p, idx) => `${idx + 1}. ${p.raw_caption}`).join('\n');
  const prompt = `다음은 위키피디아에서 가져온 ${personName}의 사진 캡션 목록이다.
각 항목을 한국어로 짧고 자연스럽게 (최대 50자) 다시 써 줘.
만약 사진이 ${personName} 본인이 아니라 다른 인물(배우자·동료·작품 속 인물 등)이거나
사물·지도·문서·서명 같은 거라면 그 줄에 "SKIP" 만 써.

원본:
${list}

응답은 정확히 ${picks.length}줄, 각 줄은 번호로 시작 (예: "1. ..."). 코드 펜스나 설명 없이.`;
  const res = await ai.models.generateContent({
    model: env.geminiModel,
    contents: prompt,
    config: { temperature: 0.4 },
  });
  const text = res.text?.trim() ?? '';
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*\d+[.):]\s*/, '').trim())
    .map((l) => (l && !l.toUpperCase().startsWith('SKIP') ? l : null));
}

const { data: figs, error } = await sb
  .from('figures')
  .select('id, slug, name, korean_name, image_url, data');
if (error) {
  console.error(error);
  process.exit(1);
}

const targets = (figs ?? []).filter((f) => {
  if (only && !only.includes(f.slug)) return false;
  if (force) return true;
  const g = (f.data as FigureData).gallery ?? [];
  return g.length === 0;
});

console.log(`Building galleries for ${targets.length} figures…\n`);

let okCount = 0;
let emptyCount = 0;
let failCount = 0;

for (let i = 0; i < targets.length; i++) {
  const f = targets[i];
  const tag = `[${String(i + 1).padStart(3, '0')}/${targets.length}] ${f.slug.padEnd(22)}`;
  const personName = f.korean_name ?? f.name;
  try {
    // Korean wiki first, fall back to English
    let items = await fetchMediaList(personName, 'ko');
    let picks = pickMedia(items, f.image_url ?? undefined);
    if (picks.length === 0) {
      items = await fetchMediaList(f.name, 'en');
      picks = pickMedia(items, f.image_url ?? undefined);
    }
    if (picks.length === 0) {
      console.log(`${tag} ⚪ no usable media`);
      emptyCount++;
      continue;
    }

    const translated = await translateCaptions(personName, picks);
    const gallery: GalleryItem[] = [];
    for (let idx = 0; idx < picks.length; idx++) {
      const cap = translated[idx];
      if (!cap) continue; // SKIP
      gallery.push({ url: picks[idx].url, caption_ko: cap });
    }

    const newData: FigureData = { ...(f.data as FigureData), gallery };
    const { error: upErr } = await sb.from('figures').update({ data: newData }).eq('id', f.id);
    if (upErr) throw upErr;

    console.log(`${tag} ✓ ${picks.length} found → ${gallery.length} kept`);
    okCount++;
  } catch (e) {
    console.log(`${tag} ✗ ${e instanceof Error ? e.message : e}`);
    failCount++;
  }
  // Polite to Gemini free tier (we're on billed tier but still keep cadence)
  await new Promise<void>((r) => setTimeout(r, 1500));
}

console.log(`\nDone. ok=${okCount} empty=${emptyCount} failed=${failCount}`);
