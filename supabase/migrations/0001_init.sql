-- ─────────────────────────────────────────────────────────────
-- InspireMe — initial schema
-- 사용법: Supabase 대시보드 → SQL Editor → 새 쿼리 → 이 파일 전체 붙여넣기 → Run
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;   -- name gin_trgm_ops 인덱스에 필요

-- 1) figures: 위인 본인 데이터 (사용자 무관, 모든 사용자 공통)
create table if not exists public.figures (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,         -- 'oprah-winfrey'
  name          text not null,                 -- 'Oprah Winfrey' (영문 표기)
  korean_name   text,                          -- '오프라 윈프리'
  title         text,                          -- '방송인, 배우, 제작자' (직업/타이틀)
  era           text,                          -- '근현대', '20세기' 등
  country       text,                          -- '미국', '독일/미국'
  birth_year    int,
  death_year    int,
  fields        text[] default '{}'::text[],   -- ['business','rights'] — shared FigureCategory와 동일 enum
  keywords      text[] default '{}'::text[],   -- ['역경','도전','자존감']
  data          jsonb not null,                -- PDF 4번 전체 JSON 구조 (FigureData)
  image_url     text,
  image_credit  text,
  source        text not null default 'prebuilt'  -- 'prebuilt' | 'runtime'
                check (source in ('prebuilt','runtime')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists figures_fields_idx on public.figures using gin (fields);
create index if not exists figures_keywords_idx on public.figures using gin (keywords);
create index if not exists figures_name_trgm_idx on public.figures using gin (name gin_trgm_ops);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists figures_set_updated_at on public.figures;
create trigger figures_set_updated_at
  before update on public.figures
  for each row execute function public.set_updated_at();

-- 2) daily_picks: 날짜별 노출 3명 (스케줄러로 채움)
create table if not exists public.daily_picks (
  date        date primary key,
  figure_ids  uuid[] not null,
  created_at  timestamptz not null default now()
);

-- 3) user_views: 디바이스별 열람 기록 (중복 노출 방지, 로그인 없이 device_id 사용)
create table if not exists public.user_views (
  device_id   text not null,
  figure_id   uuid not null references public.figures(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  primary key (device_id, figure_id)
);
create index if not exists user_views_device_idx on public.user_views (device_id, viewed_at desc);

-- ─────────────────────────────────────────────────────────────
-- RLS (Row Level Security) — 개발 중 정책
--   ※ 출시 직전에 0002_lock_rls.sql 로 잠글 예정
-- ─────────────────────────────────────────────────────────────
alter table public.figures enable row level security;
alter table public.daily_picks enable row level security;
alter table public.user_views enable row level security;

-- figures: 모두 읽기 가능, 쓰기는 service_role만 (개발 중 anon write도 임시 허용)
drop policy if exists figures_read_all on public.figures;
create policy figures_read_all on public.figures for select using (true);

drop policy if exists figures_write_anon_dev on public.figures;
create policy figures_write_anon_dev on public.figures for all using (true) with check (true);
-- 출시 전에 위 정책을 service_role 전용으로 교체할 것

-- daily_picks: 모두 읽기 가능
drop policy if exists daily_picks_read_all on public.daily_picks;
create policy daily_picks_read_all on public.daily_picks for select using (true);

drop policy if exists daily_picks_write_dev on public.daily_picks;
create policy daily_picks_write_dev on public.daily_picks for all using (true) with check (true);

-- user_views: 자기 device_id 행만 access (단순화: 모두 허용, 디바이스 키는 클라이언트가 관리)
drop policy if exists user_views_all_dev on public.user_views;
create policy user_views_all_dev on public.user_views for all using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- 사용자 프로필은 클라이언트(AsyncStorage)에만 저장. 서버 저장 안 함.
-- 이후 로그인 도입 시 profiles 테이블 추가.
-- ─────────────────────────────────────────────────────────────
