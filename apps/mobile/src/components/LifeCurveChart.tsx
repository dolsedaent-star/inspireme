import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Svg, Circle, Path, Line, SvgText } from './svg';
import type { LifeCurvePoint, UserProfile } from '@inspireme/shared';
import { colors, spacing, type } from '../theme';

const PAD = { top: 30, right: 24, bottom: 32, left: 24 };
const CHART_H = 200;

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
  const W = SCREEN_W - spacing.lg * 2;
  const H = CHART_H;

  const { pts, youPt, minAge, maxAge } = useMemo(() => {
    if (curve.length === 0) {
      return { pts: [], youPt: null, minAge: 0, maxAge: 100 };
    }
    const sorted = [...curve].sort((a, b) => a.age - b.age);
    const minAge = sorted[0].age;
    const maxAge = sorted[sorted.length - 1].age;
    const ageSpan = Math.max(1, maxAge - minAge);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const toX = (age: number) => PAD.left + ((age - minAge) / ageSpan) * innerW;
    // value is in [-1, 1]; flip so +1 is top.
    const toY = (v: number) => PAD.top + (1 - (v + 1) / 2) * innerH;

    const pts = sorted.map((p) => ({ x: toX(p.age), y: toY(p.value), label: p.label_ko, age: p.age }));

    let youPt: { x: number; y: number; age: number } | null = null;
    if (profile && profile.age >= minAge && profile.age <= maxAge) {
      // Linear interpolation along the smoothed curve at user's age.
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
    return { pts, youPt, minAge, maxAge };
  }, [curve, profile, W, H]);

  if (pts.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H}>
        {/* Zero axis */}
        <Line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + (H - PAD.top - PAD.bottom) / 2}
          y2={PAD.top + (H - PAD.top - PAD.bottom) / 2}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="3,4"
        />
        {/* Curve */}
        <Path d={smoothPath(pts)} stroke={colors.gold} strokeWidth={2.5} fill="none" />
        {/* Data points */}
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.gold} />
        ))}
        {/* You marker */}
        {youPt && (
          <>
            <Circle cx={youPt.x} cy={youPt.y} r={9} fill="rgba(255, 255, 255, 0.18)" />
            <Circle cx={youPt.x} cy={youPt.y} r={6} fill={colors.text} stroke={colors.gold} strokeWidth={2} />
            <SvgText
              x={youPt.x}
              y={youPt.y - 14}
              fill={colors.text}
              fontSize={11}
              fontWeight="700"
              textAnchor="middle"
            >
              지금의 나
            </SvgText>
          </>
        )}
      </Svg>
      {/* x-axis labels */}
      <View style={styles.axisRow}>
        <Text style={styles.axisText}>{minAge}세</Text>
        {profile ? <Text style={[styles.axisText, styles.axisYou]}>{profile.age}세</Text> : null}
        <Text style={styles.axisText}>{maxAge}세</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: PAD.left },
  axisText: { ...type.caption, color: colors.textTertiary, fontSize: 11 },
  axisYou: { color: colors.gold, fontWeight: '700' },
});
