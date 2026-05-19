import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FigureSources } from '@inspireme/shared';
import { colors, radii, spacing, type } from '../theme';

export function SourcesBlock({ sources }: { sources: FigureSources }) {
  const items: { label: string; url: string }[] = [];
  if (sources.wikipedia_ko) items.push({ label: '위키피디아 (한국어)', url: sources.wikipedia_ko });
  if (sources.wikipedia_en) items.push({ label: 'Wikipedia (English)', url: sources.wikipedia_en });
  if (sources.image_credit && !items.find((i) => i.url === sources.image_credit)) {
    items.push({ label: '인물 사진 출처', url: sources.image_credit });
  }

  return (
    <View style={styles.box}>
      <Text style={styles.disclaimer}>
        ⚠ 이 페이지의 본문은 AI(Gemini)가 위키피디아 등 공개 자료를 참고해 매거진 톤으로 다시 쓴 것입니다.
        구체적인 연도·일화는 출처에서 한 번 더 확인해 주세요.
      </Text>
      <View style={styles.list}>
        {items.map((it) => (
          <Pressable key={it.url} onPress={() => Linking.openURL(it.url)} style={styles.row}>
            <Text style={styles.label}>{it.label}</Text>
            <Text style={styles.arrow}>↗</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  disclaimer: { ...type.caption, color: colors.textSecondary, lineHeight: 20 },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { ...type.bodyKo, color: colors.text, fontSize: 14, fontWeight: '600' },
  arrow: { color: colors.gold, fontSize: 16 },
});
