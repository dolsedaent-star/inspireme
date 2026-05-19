import { z } from 'zod';

/** Mirrors packages/shared FigureData but lives here for runtime validation. */

const stageEnum = z.enum(['childhood', 'teens', 'twenties', 'thirties', 'forties', 'fifties', 'later']);
// Gemini sometimes emits "later_years" (the category) in the stage slot — coalesce.
const stage = z.preprocess(
  (v) => (v === 'later_years' || v === 'old_age' ? 'later' : v),
  stageEnum,
);
const eventCategory = z.enum(['failure', 'challenge', 'success', 'turning_point', 'later_years']);

const timelineEvent = z.object({
  age: z.number().int().min(0).max(120),
  year: z.number().int(),
  stage,
  category: eventCategory,
  title_ko: z.string().min(1),
  title_en: z.string().min(1).default(''),
  description_ko: z.string().min(1),
});

// Gemini occasionally drops `age` (null) for late-life events. Strip those
// before applying the array-length check so 1~2 missing ages don't tank
// the whole figure.
const timelineEventLoose = z.object({
  age: z.number().int().min(0).max(120).nullable(),
  year: z.number().int().nullable(),
  stage,
  category: eventCategory,
  title_ko: z.string().min(1),
  title_en: z.string().default(''),
  description_ko: z.string().min(1),
});

const lifeCurvePoint = z.object({
  age: z.number().int().min(0).max(120),
  value: z.number().min(-1).max(1),
  label_ko: z.string().min(1),
});

export const figureDataSchema = z
  .object({
    quote_ko: z.string().min(1),
    quote_en: z.string().min(1),
    summary_ko: z.string().min(10),
    keywords: z.array(z.string()).length(5),
    failure_event: timelineEventLoose.optional(),
    success_event: timelineEventLoose.optional(),
    timeline: z.array(timelineEventLoose).min(8).max(14),
    life_curve: z.array(lifeCurvePoint).min(4).max(8),
    legacy_ko: z.string().min(1),
    insights_ko: z.array(z.string()).length(3),
    comparison_ko: z.string().min(1),
    today_question_ko: z.string().min(1),
    image_prompt: z.string().min(1),
  })
  .transform((raw) => {
    // Drop timeline events that lack an age — they can't be matched to a user.
    const timeline = raw.timeline.filter((e): e is typeof e & { age: number } => e.age !== null);
    const failure_event =
      raw.failure_event && raw.failure_event.age !== null
        ? (raw.failure_event as typeof timeline[number])
        : undefined;
    const success_event =
      raw.success_event && raw.success_event.age !== null
        ? (raw.success_event as typeof timeline[number])
        : undefined;
    return { ...raw, timeline, failure_event, success_event };
  });

export type FigureDataParsed = z.infer<typeof figureDataSchema>;

export function deriveFailureSuccess(parsed: FigureDataParsed) {
  const tl = parsed.timeline;
  const failure =
    parsed.failure_event ??
    tl.find((e) => e.category === 'failure') ??
    tl.find((e) => e.category === 'challenge') ??
    tl[0];
  const success =
    parsed.success_event ??
    tl.find((e) => e.category === 'success') ??
    tl.find((e) => e.category === 'turning_point') ??
    tl[tl.length - 1];
  return { ...parsed, failure_event: failure, success_event: success };
}
