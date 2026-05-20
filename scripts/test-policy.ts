import { createClient } from '@supabase/supabase-js';
import { env } from './lib/env.js';

const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

function decodeRole(jwt: string): string {
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString()).role ?? 'no-role';
  } catch { return 'not-jwt'; }
}

console.log('Anon key role:', decodeRole(anonKey));

const sb = createClient(env.supabaseUrl, anonKey);

// Inspect policies via storage admin (the service role can list them).
const { sb: srv } = await import('./lib/supabase.js');
const { data: policies } = await srv.from('pg_policies' as any).select('*').eq('schemaname', 'storage').eq('tablename', 'objects');
console.log('storage.objects policies:', policies?.length ?? 0);
for (const p of policies ?? []) {
  console.log(`  - ${p.policyname} (${p.cmd}) roles=${p.roles} qual=${(p.qual ?? '').slice(0,60)} check=${(p.with_check ?? '').slice(0,60)}`);
}

// Try upload again
const fake = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const { error } = await sb.storage.from('figure-images').upload(
  `_test-${Date.now()}.bin`,
  fake,
  { contentType: 'application/octet-stream', upsert: false },
);
console.log('upload:', error ? 'FAIL ' + error.message : 'OK');
