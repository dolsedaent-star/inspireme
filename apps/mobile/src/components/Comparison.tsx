import { StyleSheet, Text, View } from 'react-native';
import type { TimelineEvent } from '@inspireme/shared';
import { colors, radii, spacing, type } from '../theme';

export function Comparison({
  failure,
  success,
}: {
  failure: TimelineEvent | undefined;
  success: TimelineEvent | undefined;
}) {
  return (
    <View style={styles.col}>
      {failure && (
        <Row tone="failure" age={failure.age} title={failure.title_ko} desc={failure.description_ko} />
      )}
      {success && (
        <Row tone="success" age={success.age} title={success.title_ko} desc={success.description_ko} />
      )}
    </View>
  );
}

function Row({
  tone,
  age,
  title,
  desc,
}: {
  tone: 'failure' | 'success';
  age: number;
  title: string;
  desc: string;
}) {
  const accent = tone === 'failure' ? colors.accent : colors.gold;
  const label = tone === 'failure' ? '가장 깊은 추락' : '가장 큰 도약';
  return (
    <View style={[styles.row, { borderColor: accent }]}>
      <View style={[styles.flag, { backgroundColor: accent }]}>
        <Text style={[styles.flagText, { color: tone === 'failure' ? colors.text : colors.bg }]}>
          {label}
        </Text>
      </View>
      <Text style={styles.age}>{age}세</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing.md },
  row: {
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.bgCard,
    gap: spacing.xs,
  },
  flag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  flagText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  age: { ...type.label, color: colors.textSecondary },
  title: { ...type.titleKo, fontSize: 18, color: colors.text, marginTop: 2 },
  desc: { ...type.bodyKo, color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 4 },
});
