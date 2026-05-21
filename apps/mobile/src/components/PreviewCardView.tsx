import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { UserProfile } from '../shared';
import { labelFor, matchedCategory } from '../shared';
import type { PreviewCard } from '../services/figures';
import { wikiImageSource } from '../services/images';
import { colors, radii, spacing, type } from '../theme';

/**
 * Daily screen card — preview only (image + name + 1-line teaser).
 * Tapping triggers an ad and then either fetches the cached figure or
 * runs Gemini to generate one. The Daily list never burns Gemini calls
 * for figures the user might not even look at.
 */
export interface PreviewCardProps {
  preview: PreviewCard;
  featured?: boolean;
  profile: UserProfile | null;
  onPress: () => void;
}

export function PreviewCardView({ preview, featured, profile, onPress }: PreviewCardProps) {
  const match = matchedCategory(preview.categories, profile?.fields);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        featured && styles.cardFeatured,
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      {preview.image_url ? (
        <Image
          source={wikiImageSource(preview.image_url, 900) ?? { uri: preview.image_url }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noPhotoBg]} />
      )}

      <View style={[StyleSheet.absoluteFill, styles.scrim1]} pointerEvents="none" />
      <View style={[styles.scrimBand, styles.scrim2]} pointerEvents="none" />
      <View style={[styles.scrimBand, styles.scrim3]} pointerEvents="none" />
      <View style={[styles.scrimBand, styles.scrim4]} pointerEvents="none" />

      {/* Top-right category chip (highlights user-matched field) */}
      <View style={styles.topRow}>
        {match && (
          <View style={[styles.chip, match.matched && styles.chipMatched]}>
            <Text style={[styles.chipText, match.matched && styles.chipTextMatched]}>
              {labelFor(match.category)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomBlock}>
        <Text style={styles.name} numberOfLines={2}>
          {preview.name_ko}
        </Text>
        <Text style={styles.nameEn} numberOfLines={1}>
          {preview.name_en}
        </Text>

        <View style={styles.divider} />

        {preview.preview_ko && (
          <Text style={styles.teaser} numberOfLines={3}>
            {preview.preview_ko}
          </Text>
        )}

        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>
            {preview.figureId ? '이야기 열기' : '광고 보고 열기'}
          </Text>
          <Text style={styles.ctaArrow}>→</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 460,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  cardFeatured: { borderColor: colors.gold, borderWidth: 1.5 },
  noPhotoBg: { backgroundColor: colors.bgElevated },

  scrim1: { backgroundColor: 'rgba(9, 11, 18, 0.15)' },
  scrimBand: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrim2: { height: '45%', backgroundColor: 'rgba(9, 11, 18, 0.5)' },
  scrim3: { height: '32%', backgroundColor: 'rgba(9, 11, 18, 0.75)' },
  scrim4: { height: '22%', backgroundColor: 'rgba(9, 11, 18, 0.92)' },

  topRow: { position: 'absolute', top: spacing.md, right: spacing.md, flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    backgroundColor: 'rgba(9, 11, 18, 0.55)',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(217, 179, 106, 0.4)',
  },
  chipMatched: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { ...type.label, color: colors.gold, fontSize: 10 },
  chipTextMatched: { color: colors.bg, fontWeight: '700' },

  bottomBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
  },
  name: { ...type.heroKo, color: colors.text, fontSize: 30, lineHeight: 36 },
  nameEn: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  divider: {
    height: 1,
    width: 40,
    backgroundColor: colors.gold,
    marginVertical: spacing.md,
  },
  teaser: { ...type.bodyKo, color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  ctaText: { color: colors.gold, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  ctaArrow: { color: colors.gold, fontSize: 16 },
});
