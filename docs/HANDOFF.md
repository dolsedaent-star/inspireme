# InspireMe — 작업 인수인계 (handoff)

> 회사·집 양쪽 머신에서 이어 작업하기 위한 살아있는 상태 문서. 큰 변화가 있을 때마다 갱신.

**마지막 갱신**: 2026-05-19, 03afc41 이후 + Epilogue / fill-epilogue 추가

---

## 0. 한눈에

- **컨셉**: 위인 일대기를 사용자 나이·상황에 비춰주는 GQ 매거진 톤 모바일 앱
- **스택**: Expo SDK 54 (React 19 / RN 0.81), Supabase, Gemini 2.5 Flash
- **번들 ID**: `com.inspireme.app`
- **GitHub**: <https://github.com/dolsedaent-star/inspireme>
- **Supabase**: 프로젝트 `inspireme` (계정 `dolseda@gmail.com`)
- **AI 메모**: spec과 결정사항은 `Great Person Story App Prompt And Template.pdf` 가 원본.

---

## 1. 새 머신에서 셋업 (체크리스트)

```powershell
git clone https://github.com/dolsedaent-star/inspireme.git E:\app_dev\inspireme
cd E:\app_dev\inspireme
npm install
```

### 1-1. 환경변수 채우기

두 파일에 동일한 `EXPO_PUBLIC_*` 키를 넣어야 함:

- `E:\app_dev\inspireme\.env` — 스크립트(`scripts/*`)가 읽음. service_role 키 포함.
- `E:\app_dev\inspireme\apps\mobile\.env` — Expo CLI가 빌드 타임에 inline. `EXPO_PUBLIC_*`만.

내용은 `.env.example` 참고. Supabase 대시보드 → Settings → API 에서 받으면 됨.

> ⚠ `SUPABASE_SERVICE_ROLE_KEY` 자리에 `anon` 키를 잘못 넣으면 Storage upload가 RLS 정책에 막힘. 키 두 개를 헷갈리지 말 것 (JWT 두번째 segment의 `role` 필드 확인 가능).

### 1-2. Android 폰 USB 흐름

- 폰: 개발자 옵션 + USB 디버깅 켜기, Play Store에서 Expo Go 설치
- PC: `adb devices` 로 폰이 `device` 상태인지 확인
- `npm --workspace apps/mobile run android -- --localhost` (또는 `cd apps/mobile && npx expo start --android --localhost`)
- ADB reverse 자동 세팅됨 (`adb reverse tcp:8081 tcp:8081`), 폰에서 Expo Go가 `exp://127.0.0.1:8081` 자동 열림

### 1-3. 폰에 잘 안 뜨면

- 옛 ErrorActivity 캐시 → 폰 흔들기 → Reload
- 8081 포트 충돌 → `netstat -ano | findstr :8081` 후 해당 PID `taskkill /F /PID`
- LAN IP로 deep link 가서 폰 LTE 환경이라 못 닿는 경우 → `--localhost` 빼먹은 것

---

## 2. 현재 진행 상태

### 완료 (mobile 앱)

- npm workspaces monorepo: `apps/mobile`, `packages/shared`, `scripts`
- 앱 흐름: **Profile 4단계 온보딩** (나이 → 성별 → 분야 → 상황) → **Daily** (오늘의 3명, 첫 카드 unlocked + gold border) → **Figure** (Hero 표지 + 8 섹션)
- Figure 섹션: 요약 / 핵심 키워드 / 추락과 도약 / 인생 곡선(SVG, "지금의 나" 점) / 일대기(나이대 매칭 강조) / 통찰 셋 / **말년과 죽음** / 유산 / 오늘의 질문 / 출처·검증
- `packages/shared`: Figure 타입, `personalize()` (나이대 매칭, 비교 카피, 다음 전환점)
- 디자인 토큰: `theme/` (GQ 다크 + 골드 + 시스템 serif fallback). 폰트 파일은 아직 없음.
- AsyncStorage 유저 프로필 + React Navigation NativeStack
- Supabase 클라이언트 (`services/supabase.ts`) — env 없으면 mockFigures fallback

### 완료 (데이터 파이프라인)

- `scripts/generate.ts`: Gemini 2.5 Flash + Wikipedia → zod validate → derive failure/success → upsert
- `scripts/mirror-images.ts`: figures.image_url을 Supabase Storage `figure-images` 버킷으로 mirror (Wikimedia는 RN 기본 UA에 403)
- `scripts/fill-epilogue.ts`: 기존 figure에 짧은 호출로 epilogue_ko 채움
- 무료 tier RPM 안전(3.5s sleep), 429 server-suggested retry delay 사용
- Supabase 0001 마이그레이션 적용됨. `figure-images` 버킷 public.

### 데이터 상태

- `figures` 테이블에 9명 + 사진. 사진은 Supabase Storage public URL.
- 슬러그: einstein, steve-jobs, marie-curie, mlk, oprah-winfrey, beethoven, helen-keller, mozart, nelson-mandela
- 미생성 6명(van-gogh, churchill, yi-sun-sin, sejong-the-great, nikola-tesla, frida-kahlo): Gemini 무료 일일 quota 20회 초과. 다음 날 `npm run generate` 한 줄로 자동 채워짐 (existing 체크).
- 9명 모두 `data.epilogue_ko` null — quota 복구 후 `npm run fill-epilogue` 한 줄로 채움.

---

## 3. 알려진 우회 / 한계

| 항목 | 우회 |
|---|---|
| `expo-linear-gradient` React 19 타입 X | 다단 View overlay로 그라데이션 흉내 |
| `expo-image` React 19 타입 X | RN의 `Image` 사용 |
| `react-native-svg` React 19 타입 X | `src/components/svg.ts` 에서 `ComponentType`으로 wrap |
| Wikimedia 이미지 403 (RN 기본 UA 거부) | Supabase Storage에 mirror |
| 무료 Gemini 일일 20회 quota | 사전 생성 후 캐싱. quota 회복 후 다시 generate |
| 폰트 파일 없음 | 시스템 serif fallback. 받으면 `apps/mobile/assets/fonts/` + `expo-font` plugin |

---

## 4. 다음 단계 후보

- [ ] **EAS Preview Build** — 폰에 .apk 깔아서 dev server 없이 단독 동작
- [ ] **검색·런타임 동적 생성** — 광고 unlock 후 사용자가 검색한 위인을 Gemini로 즉석 생성 + 캐시 (PDF의 hybrid 전략 중 두 번째 축)
- [ ] **daily_picks 스케줄러** — 매일 자정 3명 자동 추첨
- [ ] **device_id 기반 user_views** — 중복 노출 방지
- [ ] **AdMob interstitial** — EAS dev client 필요 (Expo Go 미지원)
- [ ] **폰트 파일 셋업** — Pretendard / Playfair Display / Noto Serif KR
- [ ] **0002 마이그레이션** — RLS 잠그기 (현재 anon write 임시 허용)
- [ ] **names.csv 확장** — 50~100명까지 늘리기
- [ ] **배경음악(BGM)** — `expo-audio`로 화면별 cross-fade + 음소거 토글 (사용자가 mp3 줄 예정)

---

## 5. 자주 쓰는 명령

```powershell
# 개발
npm run android                            # = npm --workspace apps/mobile run android
cd apps/mobile && npx expo start --android --localhost

# 콘텐츠
cd scripts && npm run generate             # CSV에 있는 figures 생성/upsert (already-exists는 skip)
cd scripts && npm run generate -- --only=einstein,churchill
cd scripts && npm run mirror-images        # image_url들을 Supabase Storage로 mirror
cd scripts && npm run fill-epilogue        # 기존 figure에 epilogue_ko 백필

# 점검
cd scripts && npx tsx check.ts             # figures 행 개수 + image_url 상태
cd scripts && npx tsx list-buckets.ts      # Storage 버킷 + 객체 목록

# 타입
cd apps/mobile && npx tsc --noEmit
cd scripts && npx tsc --noEmit
```

---

## 6. 합의·결정 메모 (잊기 쉬운 것)

- **번들 ID `com.inspireme.app`** — 출시 후 변경 불가, 확정
- **Gemini 모델 `gemini-2.5-flash`** — `.env` 의 `EXPO_PUBLIC_GEMINI_MODEL` 로 교체 가능
- **하이브리드 콘텐츠 전략**:
  1. 빌드 타임에 50~100명 사전 생성 → Supabase 저장 → 무료 사용자의 "오늘의 3명"은 여기서 추첨
  2. 사용자가 *검색*한 위인이 DB에 없으면 그 때만 Gemini → 캐시 → 평생 재사용 (광고 unlock 후)
- **personalize()는 클라이언트 측, AI 호출 0** — 같은 figure JSON을 모든 사용자가 공유. 사용자 맞춤은 클라이언트에서 계산.
- **사용자 프로필은 서버에 저장 안 함** — AsyncStorage만 사용. 로그인 도입 시점에 profiles 테이블 추가.
- **출시 직전에 0002로 RLS 잠그기** — 현재 anon write 임시 허용 중.

---

## 7. 핵심 파일 좌표

```
apps/mobile/
├── App.tsx                                  # SafeAreaProvider + Provider + Nav
├── app.json                                 # com.inspireme.app, dark, scheme inspireme
├── tsconfig.json                            # react-native-strict-api 조건 추가됨
├── .env                                     # gitignored
└── src/
    ├── theme/                               # colors / typography / spacing / fonts
    ├── state/userProfile.tsx                # AsyncStorage Context
    ├── navigation/RootNavigator.tsx         # Profile → Daily → Figure
    ├── screens/
    │   ├── ProfileScreen.tsx                # 4단계 온보딩
    │   ├── DailyScreen.tsx                  # 오늘의 3명
    │   └── FigureScreen.tsx                 # Hero + 8 섹션
    ├── components/
    │   ├── Hero.tsx                         # 표지 (사진 + 다단 scrim)
    │   ├── FigureCard.tsx                   # Daily 카드
    │   ├── SectionLabel.tsx                 # 섹션 라벨 atom
    │   ├── KeywordChips.tsx
    │   ├── TimelineList.tsx                 # 나이 매칭 강조
    │   ├── LifeCurveChart.tsx               # SVG 곡선 + "지금의 나" 점
    │   ├── InsightCards.tsx
    │   ├── Comparison.tsx                   # 추락 / 도약
    │   ├── Epilogue.tsx                     # 말년과 죽음 (epilogue_ko or fallback)
    │   ├── TodayQuestion.tsx
    │   ├── SourcesBlock.tsx                 # 출처·검증 + 디스클레이머
    │   └── svg.ts                           # react-native-svg React-19-호환 wrap
    ├── services/
    │   ├── supabase.ts                      # anon client
    │   ├── figures.ts                       # row → Figure mapper + loadDailyFigures
    │   └── images.ts                        # thumbUrl + wikiImageSource (UA header)
    └── data/mockFigures.ts                  # env 없을 때 fallback (3명)

packages/shared/src/
├── types.ts                                 # Figure / TimelineEvent / UserProfile / FigureSources
├── personalize.ts                           # stageForAge / personalize()
└── index.ts

scripts/
├── generate.ts                              # Gemini → upsert
├── fill-epilogue.ts                         # backfill epilogue_ko
├── mirror-images.ts                         # Wikimedia → Supabase Storage
├── check.ts / check-keys?.ts / list-buckets.ts / make-public.ts  # 점검 유틸
├── names.csv                                # 시드 인물 명단
└── lib/
    ├── env.ts        # dotenv + 키 require
    ├── supabase.ts   # service_role client
    ├── gemini.ts     # SDK + retry/backoff
    ├── schema.ts     # zod (failure/success optional, stage later_years→later 정규화)
    ├── prompt.ts     # 한글 매거진 톤 prompt + JSON example
    ├── wikimedia.ts  # summary + originalimage
    └── storage.ts    # bucket upload + public url

supabase/migrations/
└── 0001_init.sql                            # figures / daily_picks / user_views + RLS
```

---

## 8. 다음 머신에서 첫 한 줄

"inspireme HANDOFF.md 읽고 작업 이어가자." — 사용자 메모리 시스템도 동일 정보를 갖고 있어 빠르게 컨텍스트 복원됨.
