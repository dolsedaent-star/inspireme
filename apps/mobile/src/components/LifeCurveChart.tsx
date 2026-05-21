import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Svg, Circle, Path, Line, SvgText } from './svg';
import type { LifeCurvePoint, UserProfile } from '../shared';
import { colors, spacing, type } from '../theme';

const PAD = { top: 40, right: 32, bottom: 40, left: 32 };
const CHART_H = 260;
const PER_AGE = 14; // px per year — wider so labels breathe

/** Build a Catmull-Rom-ish smooth path through points. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 === points.length ? i + 1 : i + 2];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function LifeCurveChart({
  curve,
  profile,
}: {
  curve: LifeCurvePoint[];
  profile: UserProfile | null;
}) {
  const { width: SCREEN_W } = Dimensions.get('window');

  const { pts, youPt, youOutside, minAge, maxAge, W, H } = useMemo(() => {
    if (curve.length === 0) {
      return { pts: [], youPt: null, youOutside: false, minAge: 0, maxAge: 100, W: SCREEN_W, H: CHART_H };
    }
    const sorted = [...curve].sort((a, b) => a.age - b.age);
    const minAge = sorted[0].age;
    const maxAge = sorted[sorted.length - 1].age;
    const ageSpan = Math.max(1, maxAge - minAge);
    // Chart wider than viewport so the user scrolls horizontally to see the whole life.
    const W = Math.max(SCREEN_W - spacing.lg * 2, ageSpan * PER_AGE + PAD.left + PAD.right + 40);
    const H = CHART_H;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const toX = (age: number) => PAD.left + ((age - minAge) / ageSpan) * innerW;
    const toY = (v: number) => PAD.top + (1 - (v + 1) / 2) * innerH;

    const pts = sorted.map((p) => ({
      x: toX(p.age),
      y: toY(p.value),
      label: p.label_ko,
      age: p.age,
    }));

    let youPt: { x: number; y: number; age: number } | null = null;
    let youOutside = false;
    if (profile) {
      if (profile.age < minAge || profile.age > maxAge) {
        youOutside = true;
      } else {
        let v = sorted[0].value;
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i];
          const b = sorted[i + 1];
          if (profile.age >= a.age && profile.age <= b.age) {
            const t = (profile.age - a.age) / Math.max(1, b.age - a.age);
            v = a.value + (b.value - a.value) * t;
            break;
          }
        }
        youPt = { x: toX(profile.age), y: toY(v), age: profile.age };
      }
    }
    return { pts, youPt, youOutside, minAge, maxAge, W, H };
  }, [curve, profile, SCREEN_W]);

  if (pts.length === 0) return null;

  const zeroY = PAD.top + (H - PAD.top - PAD.bottom) / 2;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={{ width: W, height: H }}>
          <Svg width={W} height={H}>
            {/* Zero axis */}
            <Line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={zeroY}
              y2={zeroY}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3,4"
            />
            {/* Curve */}
            <Path d={smoothPath(pts)} stroke={colors.gold} strokeWidth={2.5} fill="none" />
            {/* Data points + labels (alternating above/below to avoid overlap) */}
            {pts.map((p, i) => {
              const above = i % 2 === 0;
              const labelY = above ? p.y - 14 : p.y + 24;
              return (
                <React.Fragment key={i}>
                  <Circle cx={p.x} cy={p.y} r={5} fill={colors.gold} />
                  <SvgText
                    x={p.x}
                    y={labelY}
                    fill={colors.text}
                    fontSize={11}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {p.label}
                  </SvgText>
                  <SvgText
                    x={p.x}
                    y={above ? p.y + 18 : p.y - 8}
                    fill={colors.textTertiary}
                    fontSize={9}
                    textAnchor="middle"
                  >
                    {p.age}세
                  </SvgText>
                </React.Fragment>
              );
            })}
            {/* You marker — only when user's age falls inside the lifespan */}
            {youPt && (
              <>
                <Circle cx={youPt.x} cy={youPt.y} r={11} fill="rgba(255, 255, 255, 0.18)" />
                <Circle
                  cx={youPt.x}
                  cy={youPt.y}
                  r={7}
                  fill={colors.text}
                  stroke={colors.gold}
                  strokeWidth={2}
                />
                <SvgText
                  x={youPt.x}
                  y={youPt.y - 18}
                  fill={colors.text}
                  fontSize={12}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  지금의 나 ({youPt.age}세)
                </SvgText>
              </>
            )}
          </Svg>
        </View>
      </ScrollView>

      {youOutside && profile && (
        <Text style={styles.outsideNote}>
          {profile.age > maxAge
            ? `당신은 이 인물이 살았던 시간보다 ${profile.age - maxAge}년 더 살고 있습니다.`
            : `이 인물의 곡선이 시작되는 ${minAge}세까지 아직 ${minAge - profile.age}년 남았습니다.`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -spacing.lg },
  outsideNote: {
    ...type.caption,
    color: colors.gold,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 13,
  },
});
