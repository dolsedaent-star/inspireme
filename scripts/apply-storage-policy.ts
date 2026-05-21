import { sb } from './lib/supabase.js';

// We can't execute arbitrary SQL via supabase-js, so use the
// Storage admin API to set RLS the right way. As a workaround, mirror
// the policy by using service-role for uploads (already configured),
// and tell the client to bounce uploads through this script. Better fix:
// have the user run the SQL from the dashboard.
//
// For now just print clear instructions.

console.log(`To allow anonymous clients to upload to 'figure-images':

Run this SQL in Supabase dashboard → SQL Editor (it needs admin rights
which the dashboard has):

drop policy if exists "figure_images_anon_insert_dev" on storage.objects;
create policy "figure_images_anon_insert_dev" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'figure-images');

drop policy if exists "figure_images_anon_update_dev" on storage.objects;
create policy "figure_images_anon_update_dev" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'figure-images')
  with check (bucket_id = 'figure-images');
`);

// Verify by listing existing policies via the storage admin API.
// (옛 진단 코드 — 무시. 정책은 Supabase 콘솔에서 SQL Editor로 적용됨.)
