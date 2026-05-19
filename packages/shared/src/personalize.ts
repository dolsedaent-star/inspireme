import type {
  Figure,
  PersonalizedInsight,
  TimelineEvent,
  UserProfile,
  LifeStage,
} from './types';

export function stageForAge(age: number): LifeStage {
  if (age < 13) return 'childhood';
  if (age < 20) return 'teens';
  if (age < 30) return 'twenties';
  if (age < 40) return 'thirties';
  if (age < 50) return 'forties';
  if (age < 60) return 'fifties';
  return 'later';
}

function nearestEvent(events: TimelineEvent[], age: number): TimelineEvent | null {
  if (events.length === 0) return null;
  return events.reduce((best, ev) =>
    Math.abs(ev.age - age) < Math.abs(best.age - age) ? ev : best,
  );
}

function eventInStage(events: TimelineEvent[], stage: LifeStage): TimelineEvent | null {
  return events.find((e) => e.stage === stage) ?? null;
}

function nextTurningPoint(events: TimelineEvent[], age: number): TimelineEvent | null {
  const upcoming = events
    .filter((e) => e.age > age && (e.category === 'turning_point' || e.category === 'success'))
    .sort((a, b) => a.age - b.age);
  return upcoming[0] ?? null;
}

function curvePosition(figure: Figure, age: number) {
  const curve = figure.data.life_curve;
  if (curve.length === 0) return null;
  const sorted = [...curve].sort((a, b) => a.age - b.age);
  if (age <= sorted[0].age) return { age, value: sorted[0].value };
  const last = sorted[sorted.length - 1];
  if (age >= last.age) return { age, value: last.value };
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return { age, value: a.value + (b.value - a.value) * t };
    }
  }
  return null;
}

function comparisonCopy(matching: TimelineEvent | null, figure: Figure, age: number): string {
  if (!matching) {
    return `${figure.name_ko}는 당신과 같은 ${age}세 무렵에도 자신의 길을 찾아가는 중이었습니다.`;
  }
  const ageDiff = age - matching.age;
  if (Math.abs(ageDiff) <= 1) {
    return `${figure.name_ko}는 ${matching.age}세, 지금의 당신과 같은 나이에 "${matching.title_ko}"의 순간을 맞이했습니다.`;
  }
  if (ageDiff > 0) {
    return `${figure.name_ko}는 ${matching.age}세에 "${matching.title_ko}"을(를) 경험했습니다. 당신은 그보다 ${ageDiff}년 더 길게 준비할 시간을 가졌습니다.`;
  }
  return `${figure.name_ko}는 ${matching.age}세에 "${matching.title_ko}"을(를) 경험했습니다. 당신에게는 아직 ${-ageDiff}년의 여유가 있습니다.`;
}

export function personalize(figure: Figure, user: UserProfile): PersonalizedInsight {
  const userStage = stageForAge(user.age);
  const matching =
    eventInStage(figure.data.timeline, userStage) ?? nearestEvent(figure.data.timeline, user.age);
  const turning = nextTurningPoint(figure.data.timeline, user.age);
  return {
    matching_event: matching,
    comparison_ko: comparisonCopy(matching, figure, user.age),
    next_turning_point: turning,
    years_until_next: turning ? turning.age - user.age : null,
    curve_position: curvePosition(figure, user.age),
  };
}
