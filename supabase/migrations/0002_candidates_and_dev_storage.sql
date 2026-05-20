-- ─────────────────────────────────────────────────────────────
-- InspireMe — figure_candidates + dev storage policy
-- 사용법: Supabase SQL Editor → 새 쿼리 → 이 파일 전체 붙여넣고 Run
--
-- 이 마이그레이션은 두 가지를 추가합니다:
--  1) `figure_candidates` 명단 테이블 — 사전 생성 + 런타임 풀 보충용
--  2) `figure-images` Storage에 임시 anon write 정책 — 클라이언트 동적 생성이
--     사진을 미러링할 수 있게. 출시 직전 0003에서 잠글 것.
-- ─────────────────────────────────────────────────────────────

-- 1) figure_candidates: name pool
create table if not exists public.figure_candidates (
  slug        text primary key,
  name_en     text not null,
  name_ko     text,
  categories  text[] default '{}'::text[],
  added_at    timestamptz not null default now()
);

alter table public.figure_candidates enable row level security;

drop policy if exists candidates_read_all on public.figure_candidates;
create policy candidates_read_all on public.figure_candidates for select using (true);

-- 개발 중 anon write 허용 (출시 전 잠금)
drop policy if exists candidates_write_dev on public.figure_candidates;
create policy candidates_write_dev on public.figure_candidates for all using (true) with check (true);

-- 2) figure-images Storage: 클라이언트 mirror 임시 허용
drop policy if exists "figure_images_anon_insert_dev" on storage.objects;
create policy "figure_images_anon_insert_dev" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'figure-images');

drop policy if exists "figure_images_anon_update_dev" on storage.objects;
create policy "figure_images_anon_update_dev" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'figure-images')
  with check (bucket_id = 'figure-images');

-- ─────────────────────────────────────────────────────────────
-- 출시 전 0003에서 anon write 정책을 service_role 전용으로 교체할 것.
-- ─────────────────────────────────────────────────────────────
