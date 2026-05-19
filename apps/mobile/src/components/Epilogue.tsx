import { StyleSheet, Text, View } from 'react-native';
import type { Figure } from '../shared';
import { colors, radii, spacing, type } from '../theme';

/**
 * "말년과 죽음" — closing chapter of the figure's life.
 * Prefers Gemini-generated `epilogue_ko`; otherwise falls back to
 * the timeline events tagged as `later_years` so older rows still have
 * something to show.
 */
export function Epilogue({ figure }: { figure: Figure }) {
  const { epilogue_ko, timeline, life_curve } = figure.data;

  const lateEvents = [...timeline]
    .filter((e) => e.category === 'later_years' || e.stage === 'later')
    .sort((a, b) => a.age - b.age);

  const lastCurvePoint = life_curve.length
    ? [...life_curve].sort((a, b) => a.age - b.age).slice(-1)[0]
    : null;

  const ageAtDeath =
    figure.death_year && figure.birth_year
      ? figure.death_year - figure.birth_year
      : null;

  return (
    <View style={styles.col}>
      <View style={styles.metaRow}>
        {ageAtDeath !== null && (
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>향년 {ageAtDeath}세</Text>
          </View>
        )}
        {figure.death_year && (
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>{figure.death_year}년</Text>
          </View>
        )}
        {lastCurvePoint && (
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>마지막: {lastCurvePoint.label_ko}</Text>
          </View>
        )}
      </View>

      {epilogue_ko ? (
        <Text style={styles.body}>{epilogue_ko}</Text>
      ) : lateEvents.length > 0 ? (
        <View style={styles.fallbackCol}>
          {lateEvents.map((e, i) => (
            <View key={i} style={styles.fallbackRow}>
              <Text style={styles.fallbackAge}>{e.age}세</Text>
              <View style={styles.fallbackBody}>
                <Text style={styles.fallbackTitle}>{e.title_ko}</Text>
                <Text style={styles.fallbackDesc}>{e.description_ko}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.fallbackNote}>
            ⓘ 이 인물은 초기 버전에 생성된 데이터라 별도의 말년 단락이 아직 없습니다.
            상세한 죽음·말년 묘사는 다음 콘텐츠 갱신에 추가됩니다.
          </Text>
        </View>
      ) : (
        <Text style={styles.fallbackNote}>말년에 관한 기록을 정리 중입니다.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing.md },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(217, 179, 106, 0.4)',
    backgroundColor: 'rgba(217, 179, 106, 0.08)',
  },
  metaText: { ...type.label, color: colors.gold, fontSize: 11 },
  body: { ...type.bodyKo, color: colors.text, fontSize: 16, lineHeight: 27 },

  fallbackCol: { gap: spacing.md },
  fallbackRow: { flexDirection: 'row', gap: spacing.md },
  fallbackAge: { ...type.titleKo, fontSize: 18, color: colors.gold, width: 48 },
  fallbackBody: { flex: 1, gap: 4 },
  fallbackTitle: { ...type.titleKo, fontSize: 15, color: colors.text },
  fallbackDesc: { ...type.bodyKo, color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  fallbackNote: { ...type.caption, color: colors.textTertiary, fontStyle: 'italic', marginTop: spacing.sm },
});
