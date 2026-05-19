import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';

export function KeywordChips({ keywords }: { keywords: readonly string[] }) {
  return (
    <View style={styles.row}>
      {keywords.map((k, i) => (
        <View key={`${k}-${i}`} style={styles.chip}>
          <Text style={styles.text}>#{k}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  text: { ...type.caption, color: colors.textSecondary, fontWeight: '600' },
});
