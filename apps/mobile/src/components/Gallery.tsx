import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GalleryItem } from '../shared';
import { wikiImageSource } from '../services/images';
import { colors, radii, spacing, type } from '../theme';

/**
 * Horizontal photo strip — "주요 순간".
 * Cards are tall (3:4) so faces and scenes both read well.
 * Cards that fail to load their image are dropped silently — no broken
 * placeholders. English captions are also hidden (we don't show 영문 캡션
 * to a Korean-speaking reader).
 */
export function Gallery({ items }: { items: GalleryItem[] }) {
  const [broken, setBroken] = useState<Set<number>>(new Set());

  if (!items.length) return null;

  const visible = items.filter((it, i) => !broken.has(i) && it.url);
  if (visible.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {items.map((item, i) => {
        if (broken.has(i) || !item.url) return null;
        const koCaption = isKorean(item.caption_ko) ? item.caption_ko : null;
        // Without a Korean caption we can't trust the photo is the right
        // person (Wikipedia page media often includes spouses, colleagues,
        // logos). Hide the card entirely.
        if (!koCaption) return null;
        return (
          <View key={i} style={styles.card}>
            <Image
              source={wikiImageSource(item.url, 800) ?? { uri: item.url }}
              resizeMode="cover"
              style={styles.photo}
              onError={() => setBroken((prev) => new Set(prev).add(i))}
            />
            {(item.year != null || koCaption) && (
              <View style={styles.captionBlock}>
                {item.year != null && <Text style={styles.year}>{item.year}</Text>}
                {koCaption && (
                  <Text style={styles.caption} numberOfLines={3}>
                    {koCaption}
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

/** Does the string contain Hangul? If not, treat it as a non-Korean caption
 *  that we'd rather not show to a Korean reader. */
function isKorean(s: string | undefined | null): s is string {
  if (!s) return false;
  return /[가-힣]/.test(s);
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
