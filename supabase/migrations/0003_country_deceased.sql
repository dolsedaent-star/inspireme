-- ─────────────────────────────────────────────────────────────
-- InspireMe — country + deceased 필드 추가
-- figure_candidates에 출신 국가와 생존 여부 추가.
-- - country: 소문자 단순 코드 ('korea', 'usa', 'uk' 등)
-- - deceased: false이면 후보·캐시 풀에서 제외
-- ─────────────────────────────────────────────────────────────

alter table public.figure_candidates
  add column if not exists country  text,
  add column if not exists deceased boolean not null default true;

-- figures 테이블에도 country 정규화 컬럼 추가 (생성기가 채워 줌)
-- (기존 country 컬럼은 Gemini가 쓴 자유 텍스트 — 이 컬럼은 canonical 코드)
alter table public.figures
  add column if not exists country_code text;
