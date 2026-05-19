# InspireMe

> 한 사람의 인생을 디지털 매거진처럼 보여주는 인터랙티브 전기 앱.
> "당신의 인생도 아직 끝나지 않았다."

위인의 일대기를 GQ 매거진 스타일로 풀어내며, **사용자의 나이·상황·관심 분야**에 맞춰 비교 카피와 인사이트가 동적으로 재구성됩니다. iOS와 Android 양쪽 출시 목표.

## 모노레포 구조

```
inspireme/
├── apps/
│   └── mobile/              # Expo React Native 앱 (iOS + Android)
├── packages/
│   └── shared/              # 공용 타입 + 맞춤 함수 (matchByAge 등)
├── scripts/                 # Gemini 기반 위인 데이터 생성기
├── supabase/
│   └── migrations/          # DB 스키마 (SQL Editor에 붙여넣기)
├── data/                    # 사전 생성된 위인 JSON 풀
├── docs/                    # 프롬프트·디자인 가이드
└── .env / .env.example
```

## 사용한 외부 서비스

| 서비스 | 용도 | 무료 한도 |
|---|---|---|
| **Gemini 2.5 Flash** | 위인 JSON 생성 (사전 + 런타임 캐시) | 일 1500 req |
| **Supabase** (Postgres + Storage) | 위인 데이터 캐시 + 이미지 저장 | 500MB DB / 1GB Storage |
| **Wikipedia / Wikimedia** | 초기 이미지·사실 데이터 | 무제한 |
| **Google AdMob** | 추가 위인 열람 시 인터스티셜 광고 | 무료 |
| **Expo EAS** | iOS/Android 클라우드 빌드 (Mac 불필요) | 월 30 build |

## 데이터 흐름

1. **빌드 타임**: `scripts/generate.ts`가 카테고리별로 균형 잡힌 50~100명을 Gemini로 생성 → Supabase `figures` 테이블 upsert.
2. **런타임 (앱)**: 사용자가 검색한 위인은 Supabase 캐시 조회 → 미스 시 Gemini 호출 → 캐시에 저장.
   따라서 한 위인은 **평생 1회만** 생성됨 (API 비용 통제).
3. **맞춤 레이어**: `packages/shared/personalize.ts`가 `user.age`·`user.fields`로 위인 데이터에서 매칭 이벤트·비교 카피를 즉석 합성 (AI 호출 0회).

## 빠른 시작

```bash
# 1. 의존성 설치
cd apps/mobile && npm install

# 2. 환경 변수 (루트의 .env가 자동으로 expo에 로드됨)
cp .env.example .env   # 키 채우기

# 3. 위인 데이터 한 명 생성해보기
cd scripts && npx tsx generate.ts --name "Oprah Winfrey"

# 4. 앱 실행 (휴대폰에서 Expo Go로 QR 스캔)
cd apps/mobile && npx expo start
```

## 회사 ↔ 집 동기화

이 repo는 양쪽 머신에서 동시에 작업합니다.

```bash
# 작업 시작 전
git pull --rebase

# 작업 끝
git add -A && git commit -m "..."
git push
```

`.env`는 절대 git에 안 올라가므로 (.gitignore), 양쪽 머신에서 각각 채워야 합니다.

## 라이선스

내부 프로젝트. 모든 권리 보유.
