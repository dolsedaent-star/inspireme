import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';

export function InsightCards({ insights }: { insights: readonly [string, string, string] | string[] }) {
  return (
    <View style={styles.col}>
      {insights.map((ins, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.num}>0{i + 1}</Text>
          <Text style={styles.text}>{ins}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing.md },
  card: {
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  num: { ...type.label, color: colors.gold, fontSize: 12 },
  text: { ...type.bodyKo, color: colors.text, fontSize: 15, lineHeight: 24 },
});
