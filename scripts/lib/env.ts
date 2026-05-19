import 'dotenv/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

// `dotenv/config` only looks at cwd. We always want the monorepo root .env.
const rootEnv = resolve(import.meta.dirname, '..', '..', '.env');
if (existsSync(rootEnv)) loadDotenv({ path: rootEnv, override: true });

function require_(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`✗ Missing env var: ${key}\n  Fill it in ${rootEnv} and re-run.`);
    process.exit(1);
  }
  return v;
}

export const env = {
  geminiApiKey: require_('EXPO_PUBLIC_GEMINI_API_KEY'),
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash',
  supabaseUrl: require_('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseServiceKey: require_('SUPABASE_SERVICE_ROLE_KEY'),
};
