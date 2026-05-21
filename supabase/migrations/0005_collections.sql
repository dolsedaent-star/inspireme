-- ─────────────────────────────────────────────────────────────
-- InspireMe — themed collections (curated)
--
-- 큐레이션된 묶음 (브랜드 창립자, 노벨 평화상, 한국 근현대 등).
-- 구독자용 콘텐츠 시드.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.figure_collections (
  slug             text primary key,
  title_ko         text not null,
  subtitle_ko      text,
  description_ko   text,
  cover_image_url  text,
  figure_slugs     text[] not null default '{}'::text[],
  premium          boolean not null default false,
  display_order    int not null default 100,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.figure_collections enable row level security;

drop policy if exists collections_read_all on public.figure_collections;
create policy collections_read_all on public.figure_collections for select using (true);

-- 개발 중 anon write 임시 허용 (출시 전 잠금)
drop policy if exists collections_write_dev on public.figure_collections;
create policy collections_write_dev on public.figure_collections for all using (true) with check (true);

create index if not exists figure_collections_order_idx
  on public.figure_collections (display_order);
