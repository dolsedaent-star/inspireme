/**
 * Backfill `data.epilogue_ko` for figures generated before the field was
 * added. Cheap, focused Gemini calls (~150 output tokens each).
 *
 *   npm run fill-epilogue            # all figures missing epilogue
 *   npm run fill-epilogue -- --only=einstein,steve-jobs
 */

import { GoogleGenAI } from '@google/genai';
import { env } from './lib/env.js';
import { sb } from './lib/supabase.js';
import type { FigureData } from '../packages/shared/src/types.js';

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

const onlyFlag = process.argv.find((a) => a.startsWith('--only='));
const only = onlyFlag ? onlyFlag.slice('--only='.length).split(',') : null;

function buildPrompt(name_ko: string, name_en: string, birth: number | null, death: number | null) {
  const lifespan =
    birth && death ? `${birth}–${death} (향년 ${death - birth}세)` : '연도 미상';
  return `${name_ko} (${name_en}, ${lifespan})의 말년과 죽음에 관한 한국어 단락을 4~6문장으로 매거진 톤으로 작성하라.

포함할 것:
- 말년의 건강·경제·주변 관계·심리
- 어떤 환경에서 어떻게 죽음을 맞이했는지 (장소·원인·곁에 누가 있었는지·당시 분위기)
- 마지막 순간에 그가 어떤 표정이나 말을 남겼는지 (전해진 바가 있다면)
- 행복했는지 외로웠는지를 솔직하게

사실이 불명확한 부분은 "전해진 바로는…" 같은 완곡한 표현 사용.
순수 텍스트 한 단락만 반환 (JSON 아님, 코드 펜스 없음).`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isTransient(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\b(429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED)\b/i.test(msg);
}

async function callGeminiText(prompt: string): Promise<string> {
  const delays = [0, 5_000, 20_000, 60_000];
  let lastErr: unknown;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);
    try {
      const r = await ai.models.generateContent({
        model: env.geminiModel,
        contents: prompt,
        config: { temperature: 0.7 },
      });
      const text = r.text?.trim();
      if (!text) throw new Error('empty response');
      return text;
    } catch (e) {
      lastErr = e;
      if (!isTransient(e) || i === delays.length - 1) throw e;
    }
  }
  throw lastErr;
}

const { data: rows, error } = await sb
  .from('figures')
  .select('id, slug, korean_name, name, birth_year, death_year, data')
  .order('slug');

if (error) {
  console.error(error);
  process.exit(1);
}

const targets = (rows ?? []).filter((r) => {
  const data = r.data as FigureData;
  const needsEpilogue = !data.epilogue_ko || data.epilogue_ko.length < 10;
  return needsEpilogue && (only ? only.includes(r.slug) : true);
});

console.log(`Filling epilogue for ${targets.length} figures…\n`);

let ok = 0;
let fail = 0;
for (let i = 0; i < targets.length; i++) {
  const r = targets[i];
  const tag = `[${String(i + 1).padStart(2, '0')}/${targets.length}] ${r.slug.padEnd(22)}`;
  try {
    const prompt = buildPrompt(r.korean_name ?? r.name, r.name, r.birth_year, r.death_year);
    const epilogue = await callGeminiText(prompt);
    const newData: FigureData = { ...(r.data as FigureData), epilogue_ko: epilogue };
    const { error: upErr } = await sb.from('figures').update({ data: newData }).eq('id', r.id);
    if (upErr) throw upErr;
    console.log(`${tag} ✓ ${epilogue.length} chars`);
    ok++;
  } catch (e) {
    console.log(`${tag} ✗ ${(e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 100)}`);
    fail++;
  }
  // throttle to free-tier RPM (~15/min)
  if (i < targets.length - 1) await sleep(4_000);
}

console.log(`\nDone. ok=${ok} failed=${fail}`);
