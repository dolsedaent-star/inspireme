/**
 * InspireMe shared types — Figure JSON spec (PDF #4) + user profile.
 * Mirrors the Supabase `figures.data` JSONB and is the contract between
 * Gemini generation scripts and the mobile client.
 */

export type LifeStage =
  | 'childhood'
  | 'teens'
  | 'twenties'
  | 'thirties'
  | 'forties'
  | 'fifties'
  | 'later';

export type EventCategory =
  | 'failure'
  | 'challenge'
  | 'success'
  | 'turning_point'
  | 'later_years';

export type FigureCategory =
  | 'science'
  | 'art'
  | 'business'
  | 'sports'
  | 'literature'
  | 'philosophy'
  | 'politics'
  | 'music'
  | 'film'
  | 'tech'
  | 'social'
  | 'military'
  | 'exploration';

export interface TimelineEvent {
  age: number;
  year: number;
  stage: LifeStage;
  category: EventCategory;
  title_ko: string;
  title_en: string;
  description_ko: string;
}

export interface LifeCurvePoint {
  age: number;
  value: number;
  label_ko: string;
}

export interface FigureData {
  quote_ko: string;
  quote_en: string;
  summary_ko: string;
  keywords: [string, string, string, string, string];
  failure_event: TimelineEvent;
  success_event: TimelineEvent;
  timeline: TimelineEvent[];
  life_curve: LifeCurvePoint[];
  legacy_ko: string;
  insights_ko: [string, string, string];
  comparison_ko: string;
  today_question_ko: string;
  image_prompt: string;
}

export interface FigureSources {
  wikipedia_ko?: string;
  wikipedia_en?: string;
  image_credit?: string;
  generated_by?: string; // e.g. "gemini-2.5-flash"
  generated_at?: string;
}

export interface Figure {
  id: string;
  name_ko: string;
  name_en: string;
  era: string;
  birth_year: number;
  death_year: number | null;
  country: string;
  categories: FigureCategory[];
  cover_image_url: string | null;
  image_credit: string | null;
  sources: FigureSources;
  data: FigureData;
}

export type Gender = 'male' | 'female';

export interface UserProfile {
  age: number;
  gender: Gender;
  fields: FigureCategory[];
  situation_ko?: string;
  created_at: string;
}

export interface DailyPick {
  date: string;
  figure_ids: [string, string, string];
}

export interface PersonalizedInsight {
  matching_event: TimelineEvent | null;
  comparison_ko: string;
  next_turning_point: TimelineEvent | null;
  years_until_next: number | null;
  curve_position: { age: number; value: number } | null;
}
