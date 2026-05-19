import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';

export function TodayQuestion({ question }: { question: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.eyebrow}>오늘의 질문</Text>
      <Text style={styles.text}>{question}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(217, 179, 106, 0.4)',
    backgroundColor: 'rgba(217, 179, 106, 0.07)',
  },
  eyebrow: { ...type.label, color: colors.gold, marginBottom: spacing.md },
  text: { ...type.quoteKo, color: colors.text, fontSize: 18, lineHeight: 28 },
});
