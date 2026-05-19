import { GoogleGenAI } from '@google/genai';
import { env } from './env.js';
import { deriveFailureSuccess, figureDataSchema, type FigureDataParsed } from './schema.js';

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isTransientError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /\b(429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|DEADLINE_EXCEEDED)\b/i.test(msg);
}

/** Parse server-suggested retry delay (e.g., "Please retry in 43.97s") in seconds. */
function parseRetryDelay(e: unknown): number | null {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
  return m ? Math.ceil(parseFloat(m[1])) : null;
}

async function callGemini(prompt: string): Promise<string> {
  // 5 attempts. Use server-suggested delay when 429, otherwise exponential.
  const fallback = [0, 5_000, 15_000, 45_000, 75_000];
  let lastErr: unknown;
  for (let i = 0; i < fallback.length; i++) {
    if (i > 0) {
      const suggested = parseRetryDelay(lastErr);
      const wait = suggested ? Math.min(suggested * 1000 + 500, 90_000) : fallback[i];
      await sleep(wait);
    }
    try {
      const response = await ai.models.generateContent({
        model: env.geminiModel,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.7 },
      });
      const text = response.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (e) {
      lastErr = e;
      if (!isTransientError(e) || i === fallback.length - 1) throw e;
    }
  }
  throw lastErr;
}

export async function generateFigure(prompt: string): Promise<FigureDataParsed> {
  const text = await callGemini(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON:\n${text.slice(0, 300)}`);
  }

  const result = figureDataSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Validation failed:\n${issues}`);
  }

  return deriveFailureSuccess(result.data);
}
