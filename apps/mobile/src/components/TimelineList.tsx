import { StyleSheet, Text, View } from 'react-native';
import type { EventCategory, TimelineEvent, UserProfile } from '@inspireme/shared';
import { stageForAge } from '@inspireme/shared';
import { colors, radii, spacing, type } from '../theme';

const CATEGORY_LABEL: Record<EventCategory, string> = {
  failure: '실패',
  challenge: '도전',
  success: '성공',
  turning_point: '전환점',
  later_years: '말년',
};

const CATEGORY_COLOR: Record<EventCategory, string> = {
  failure: '#FF5A5A',
  challenge: '#FFA63E',
  success: '#D9B36A',
  turning_point: '#7EC8E3',
  later_years: '#9AA3B2',
};

export function TimelineList({
  events,
  profile,
}: {
  events: TimelineEvent[];
  profile: UserProfile | null;
}) {
  const userStage = profile ? stageForAge(profile.age) : null;
  const sorted = [...events].sort((a, b) => a.age - b.age);

  return (
    <View style={styles.col}>
      {sorted.map((e, i) => {
        const matchesUser = userStage !== null && e.stage === userStage;
        return (
          <View key={`${e.age}-${i}`} style={styles.row}>
            <View style={styles.left}>
              <Text style={[styles.age, matchesUser && styles.ageActive]}>{e.age}세</Text>
              <Text style={styles.year}>{e.year}</Text>
              {i < sorted.length - 1 && <View style={styles.spine} />}
            </View>
            <View style={[styles.card, matchesUser && styles.cardActive]}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { borderColor: CATEGORY_COLOR[e.category] }]}>
                  <Text style={[styles.badgeText, { color: CATEGORY_COLOR[e.category] }]}>
                    {CATEGORY_LABEL[e.category]}
                  </Text>
                </View>
                {matchesUser && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>지금의 당신</Text>
                  </View>
                )}
              </View>
              <Text style={styles.title}>{e.title_ko}</Text>
              <Text style={styles.desc}>{e.description_ko}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  left: { width: 56, alignItems: 'center' },
  age: { ...type.titleKo, fontSize: 18, color: colors.text },
  ageActive: { color: colors.gold },
  year: { ...type.caption, color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  spine: { width: 1, flex: 1, backgroundColor: colors.border, marginTop: spacing.sm },
  card: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  cardActive: { borderColor: colors.gold, backgroundColor: 'rgba(217, 179, 106, 0.08)' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  youBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.gold,
  },
  youBadgeText: { fontSize: 10, fontWeight: '700', color: colors.bg, letterSpacing: 1 },
  title: { ...type.titleKo, fontSize: 16, color: colors.text, marginBottom: 4 },
  desc: { ...type.bodyKo, fontSize: 14, lineHeight: 22, color: colors.textSecondary },
});
