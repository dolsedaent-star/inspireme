import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GalleryItem } from '../shared';
import { wikiImageSource } from '../services/images';
import { colors, radii, spacing, type } from '../theme';

/**
 * Horizontal photo strip — "주요 순간".
 * Cards are tall (3:4) so faces and scenes both read well.
 */
export function Gallery({ items }: { items: GalleryItem[] }) {
  if (!items.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {items.map((item, i) => (
        <View key={i} style={styles.card}>
          <Image source={wikiImageSource(item.url, 800) ?? { uri: item.url }} resizeMode="cover" style={styles.photo} />
          <View style={styles.captionBlock}>
            {item.year != null && <Text style={styles.year}>{item.year}</Text>}
            {item.caption_ko && (
              <Text style={styles.caption} numberOfLines={3}>
                {item.caption_ko}
              </Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const CARD_W = 220;
const CARD_H = 290;

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -spacing.lg },
  row: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: {
    width: CARD_W,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: { width: '100%', height: CARD_H, backgroundColor: colors.bgElevated },
  captionBlock: { padding: spacing.md, gap: 4, minHeight: 60 },
  year: { ...type.label, color: colors.gold, fontSize: 11 },
  caption: { ...type.caption, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
});
