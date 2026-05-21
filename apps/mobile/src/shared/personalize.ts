import type { Figure, PersonalizedInsight, TimelineEvent, UserProfile, LifeStage } from './types';

export function stageForAge(age: number): LifeStage {
  if (age < 13) return 'childhood';
  if (age < 20) return 'teens';
  if (age < 30) return 'twenties';
  if (age < 40) return 'thirties';
  if (age < 50) return 'forties';
  if (age < 60) return 'fifties';
  return 'later';
}

/** Death/late-life events shouldn't anchor the "지금의 당신에게" copy. */
function eligibleTimeline(timeline: TimelineEvent[]): TimelineEvent[] {
  return timeline.filter((e) => e.category !== 'later_years' && e.stage !== 'later');
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
  return events
    .filter((e) => e.age > age && (e.category === 'turning_point' || e.category === 'success'))
    .sort((a, b) => a.age - b.age)[0] ?? null;
}

function curvePosition(figure: Figure, age: number) {
  const curve = figure.data.life_curve;
  if (curve.length === 0) return null;
  const sorted = [...curve].sort((a, b) => a.age - b.age);
  if (age <= sorted[0].age) return { age, value: sorted[0].value };
  const last = sorted[sorted.length - 1];
  if (age >= last.age) return { age, value: last.value };
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return { age, value: a.value + (b.value - a.value) * t };
    }
  }
  return null;
}

function isPositive(c: TimelineEvent['category']): boolean {
  return c === 'success' || c === 'turning_point';
}

function comparisonCopy(matching: TimelineEvent | null, figure: Figure, age: number): string {
  const name = figure.name_ko;
  if (!matching) {
    return `${name}도 ${age}세 무렵, 자신의 길을 찾아가는 중이었습니다.`;
  }
  const title = `'${matching.title_ko}'`;
  const positive = isPositive(matching.category);
  const ageDiff = age - matching.age; // > 0 = 사용자가 더 나이 많음

  // 같은 나이대 (±1)
  if (Math.abs(ageDiff) <= 1) {
    return positive
      ? `${name}도 ${matching.age}세, 지금의 당신과 같은 나이에 ${title}의 시기를 보내고 있었습니다.`
      : `${name}도 ${matching.age}세 무렵, ${title}의 시기를 지나고 있었습니다.`;
  }

  // 사용자가 더 나이가 많은 경우 — "조급해 말라" 격려 톤
  if (ageDiff > 0) {
    return positive
      ? `${name}는 ${matching.age}세에 ${title}을(를) 만들어냈습니다. 시작은 어디서든 가능합니다.`
      : `${name}도 ${matching.age}세 무렵, ${title}의 시기를 지났습니다. 그 후로도 인생은 길게 이어졌습니다.`;
  }

  // 위인이 더 나이가 많은 경우 — "당신에게 시간이 남아 있다" 격려 톤
  return positive
    ? `${name}는 지금의 당신보다 ${-ageDiff}살 뒤인 ${matching.age}세에 ${title}을(를) 이뤘습니다. 그 시간은 아직 당신에게 남아 있습니다.`
    : `${name}는 ${matching.age}세에 ${title}의 시기를 맞이했습니다. 모든 인생에 굴곡이 있습니다.`;
}

export function personalize(figure: Figure, user: UserProfile): PersonalizedInsight {
  const timeline = eligibleTimeline(figure.data.timeline);
  const userStage = stageForAge(user.age);
  const matching = eventInStage(timeline, userStage) ?? nearestEvent(timeline, user.age);
  const turning = nextTurningPoint(timeline, user.age);
  return {
    matching_event: matching,
    comparison_ko: comparisonCopy(matching, figure, user.age),
    next_turning_point: turning,
    years_until_next: turning ? turning.age - user.age : null,
    curve_position: curvePosition(figure, user.age),
  };
}
