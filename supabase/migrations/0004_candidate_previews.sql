-- ─────────────────────────────────────────────────────────────
-- InspireMe — figure_candidates에 미리보기용 컬럼 추가
--
-- 새 흐름: Daily 카드 = 미리보기만 (사진 + 이름 + 1줄). 사용자가 탭하면
-- 광고 시청 후 Gemini로 풀 콘텐츠 생성 + DB 캐시.
--
-- candidates의 image_url / image_credit / preview_ko는 server에서 한 번
-- Wikipedia로부터 prefetch (`npm run prefetch-previews`). Gemini 호출 0원.
-- ─────────────────────────────────────────────────────────────

alter table public.figure_candidates
  add column if not exists image_url    text,
  add column if not exists image_credit text,
  add column if not exists preview_ko   text;

-- figures.slug ↔ figure_candidates.slug 가 1:1이라 인덱스는 PK 그대로.
-- 단, 사용자 fields 매칭이 자주 일어나니 categories에 GIN 추가.
create index if not exists figure_candidates_categories_idx
  on public.figure_candidates using gin (categories);
