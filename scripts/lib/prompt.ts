export interface PromptInput {
  name_en: string;
  name_ko: string;
  categories: string[];
  wiki_summary?: string;
  birth_year?: number;
  death_year?: number | null;
}

export function buildPrompt(input: PromptInput): string {
  const lifespan =
    input.birth_year && input.death_year
      ? `${input.birth_year}–${input.death_year} (${input.death_year - input.birth_year}세)`
      : input.birth_year
        ? `${input.birth_year} 출생`
        : '연도 미상';
  const wiki = input.wiki_summary ? `\n참고 (Wikipedia 요약):\n${input.wiki_summary}\n` : '';
  return `너는 한국어로 "InspireMe"라는 동기부여 앱을 위한 GQ 매거진 톤의 위인 일대기 데이터를 생성한다.
대상 인물: ${input.name_ko} (${input.name_en}), ${lifespan}
분야: ${input.categories.join(', ')}
${wiki}
아래 JSON 스키마를 **정확히** 따라 한 인물의 데이터를 생성하라. 한국어 텍스트는 자연스럽고 감성적이며, 사실은 정확하게.

규칙:
- timeline은 정확히 10~12개의 이벤트. 각 나이대(childhood/teens/twenties/thirties/forties/fifties/later)에 최소 1개씩 분포.
- 각 event의 category는 다음 중 하나: failure, challenge, success, turning_point, later_years
- failure_event는 인물 인생의 가장 깊은 실패/시련 한 가지. success_event는 가장 큰 성취. 둘 다 timeline에도 포함될 수 있음.
- epilogue_ko는 4~6문장. 인물의 말년이 어땠는지(건강·경제·주변 관계·심리), 어떤 환경에서 어떻게 죽음을 맞이했는지(장소·원인·곁에 누가 있었는지·당시 분위기), 마지막 순간에 그가 어떤 표정·말을 남겼는지를 차분한 매거진 톤으로 서술. 행복했는지 외로웠는지를 솔직하게. 사실이 불명확하면 "전해진 바로는…" 같은 완곡한 표현 사용.
- keywords는 정확히 5개의 한국어 키워드 (각 1~6자).
- life_curve는 5~6개의 (age, value, label_ko) 점. value는 -1.0(최저)~+1.0(최고). 인생의 굴곡을 표현.
- insights_ko는 정확히 3개. 각 인사이트는 사용자가 자기 인생에 비춰볼 만한 1~2문장의 따뜻한 통찰.
- comparison_ko는 "X는 N세에 ...했다" 형태의 한 문장 (시대 비교용 미끼).
- today_question_ko는 사용자가 오늘 자기 자신에게 물어볼 만한 한 문장의 질문.
- image_prompt는 표지 이미지를 위한 영어 1문장 묘사 (인물 초상 + 매거진 분위기).
- quote_ko는 한국어 명언 (실제로 인물이 한 말이거나 자주 인용되는 것 우선, 없으면 그의 가치관을 압축한 1문장).
- quote_en은 quote_ko의 영어 원문 또는 영어 번역.

응답은 **순수 JSON 객체만** 반환. 코드 펜스나 추가 설명 없이.

다음은 정확한 출력 형식의 예시 (필드/타입을 그대로 따르되 내용은 대상 인물에 맞춰 다시 쓸 것):

\`\`\`json
{
  "quote_ko": "...",
  "quote_en": "...",
  "summary_ko": "...",
  "keywords": ["키워드1","키워드2","키워드3","키워드4","키워드5"],
  "failure_event": { "age": 30, "year": 1985, "stage": "thirties", "category": "failure", "title_ko": "...", "title_en": "...", "description_ko": "..." },
  "success_event": { "age": 52, "year": 2007, "stage": "fifties", "category": "success", "title_ko": "...", "title_en": "...", "description_ko": "..." },
  "timeline": [
    { "age": 5, "year": 1960, "stage": "childhood", "category": "turning_point", "title_ko": "...", "title_en": "...", "description_ko": "..." }
  ],
  "life_curve": [ { "age": 21, "value": 0.6, "label_ko": "..." } ],
  "legacy_ko": "...",
  "epilogue_ko": "말년·죽음·마지막 순간 4~6문장.",
  "insights_ko": ["...","...","..."],
  "comparison_ko": "...",
  "today_question_ko": "...",
  "image_prompt": "..."
}
\`\`\`

이벤트 객체는 반드시 { age, year, stage, category, title_ko, title_en, description_ko } 7개 필드를 모두 가질 것.
곡선 객체는 반드시 { age, value, label_ko } 3개 필드.`;
}
