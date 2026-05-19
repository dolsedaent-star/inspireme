import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

export function SectionLabel({ children }: { children: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.bar} />
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  bar: { width: 24, height: 1, backgroundColor: colors.gold },
  text: { ...type.label, color: colors.gold },
});
