import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const sb = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function figureExists(slug: string): Promise<boolean> {
  const { data, error } = await sb.from('figures').select('id').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
