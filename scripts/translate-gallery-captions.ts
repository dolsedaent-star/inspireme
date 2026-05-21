/**
 * Translate / regenerate gallery captions into Korean.
 *
 *   npm run translate-captions
 *
 * For each figure whose data.gallery has any captions that aren't already
 * Korean, asks Gemini to rewrite all of them as one batch (~1원/figure).
 * Captions that look like they reference a different person ("with his wife",
 * "사돈과 함께", etc.) get marked so the client can drop those photos.
 */

import { GoogleGenAI } from '@google/genai';
import { env } from './lib/env.js';
import { sb } from './lib/supabase.js';
import type { FigureData, GalleryItem } from '../apps/mobile/src/shared/types.js';

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

function looksKorean(s: string | undefined): boolean {
  return !!s && /[가-힣]/.test(s);
}

const onlyFlag = process.argv.find((a) => a.startsWith('--only='));
const only = onlyFlag ? onlyFlag.slice('--only='.length).split(',') : null;

const { data: figures, error } = await sb
  .from('figures')
  .select('id, slug, name, korean_name, data');
if (error) {
  console.error(error);
  process.exit(1);
}

const targets = (figures ?? []).filter((f) => {
  if (only && !only.includes(f.slug)) return false;
  const data = f.data as FigureData;
  const gallery = data.gallery ?? [];
  if (gallery.length === 0) return false;
  // Skip if every existing caption is already Korean.
  return gallery.some((g: GalleryItem) => !looksKorean(g.caption_ko));
});

console.log(`Translating gallery captions for ${targets.length} figures…\n`);

let ok = 0;
let fail = 0;

for (let i = 0; i < targets.length; i++) {
  const f = targets[i];
  const tag = `[${String(i + 1).padStart(3, '0')}/${targets.length}] ${f.slug.padEnd(22)}`;
  const data = f.data as FigureData;
  const gallery = (data.gallery ?? []) as GalleryItem[];

  // Build numbered list of source captions / filenames
  const list = gallery
    .map((g, idx) => `${idx + 1}. ${g.caption_ko ?? '(no caption)'}`)
    .join('\n');

  const personName = f.korean_name ?? f.name;
  const prompt = `다음은 위키피디아에서 가져온 ${personName}(${f.name})의 사진 캡션 목록이다. 각 항목을 한국어로 자연스럽고 짧게 (최대 60자) 다시 써 줘. 만약 그 사진이 ${personName} 본인 사진이 아니라 다른 인물(배우자·동료·작품 속 인물 등)이거나 사물·지도·문서 같은 거라면 "SKIP"이라고만 써.

원본:
${list}

응답 형식 (각 줄마다 번호로 시작, 정확히 ${gallery.length}줄):
1. ...
2. ...
...

설명·코드 펜스·인사말 없이 답만.`;

  try {
    const res = await ai.models.generateContent({
      model: env.geminiModel,
      contents: prompt,
      config: { temperature: 0.4 },
    });
    const text = res.text?.trim();
    if (!text) throw new Error('empty response');

    const lines = text.split('\n').map((l) => l.replace(/^\s*\d+[.):]\s*/, '').trim());
    const newGallery: GalleryItem[] = [];
    for (let idx = 0; idx < gallery.length; idx++) {
      const orig = gallery[idx];
      const next = lines[idx];
      if (!next || next.toUpperCase().startsWith('SKIP') || next === '') {
        continue; // drop unrelated photos
      }
      newGallery.push({ ...orig, caption_ko: next });
    }

    const updatedData: FigureData = { ...data, gallery: newGallery };
    const { error: upErr } = await sb.from('figures').update({ data: updatedData }).eq('id', f.id);
    if (upErr) throw upErr;

    console.log(`${tag} ✓ ${gallery.length} → ${newGallery.length} captions`);
    ok++;
  } catch (e) {
    console.log(`${tag} ✗ ${e instanceof Error ? e.message : e}`);
    fail++;
  }
  // Polite to free tier
  await new Promise<void>((r) => setTimeout(r, 3500));
}

console.log(`\nDone. ok=${ok} failed=${fail}`);
