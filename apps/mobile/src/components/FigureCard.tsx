import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { personalize } from '../shared';
import type { Figure, UserProfile } from '../shared';
import { labelFor, matchedCategory } from '../shared';
import { colors, radii, spacing, type } from '../theme';
import { wikiImageSource } from '../services/images';

/**
 * Daily picks card — magazine cover composition.
 * - Portrait of the figure fills the frame (RN Image; expo-image deferred
 *   until its types ship React-19-friendly definitions).
 * - Three stacked semi-transparent layers fake a vertical dark gradient so we
 *   don't pull in expo-linear-gradient (broken with React 19 right now).
 * - Bottom: gold eyebrow → big serif name → quote / personalized teaser.
 */

export interface FigureCardProps {
  figure: Figure;
  locked: boolean;
  featured?: boolean;
  profile: UserProfile | null;
  onPress: () => void;
  onUnlock: () => void;
}


export function FigureCard({
  figure,
  locked,
  featured,
  profile,
  onPress,
  onUnlock,
}: FigureCardProps) {
  const teaser = useMemo(() => {
    if (!profile) return figure.data.summary_ko;
    return personalize(figure, profile).comparison_ko;
  }, [figure, profile]);

  return (
    <Pressable
      onPress={locked ? onUnlock : onPress}
      style={({ pressed }) => [
        styles.card,
        featured && styles.cardFeatured,
        pressed && !locked && { transform: [{ scale: 0.985 }] },
      ]}
    >
      {figure.cover_image_url ? (
        <Image
          source={wikiImageSource(figure.cover_image_url, 900)!}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          onError={(e) => console.log('[img error]', figure.id, e.nativeEvent)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noPhotoBg]} />
      )}

      {/* Layered dark scrim (top-light → bottom-heavy) */}
      <View style={[StyleSheet.absoluteFill, styles.scrim1]} pointerEvents="none" />
      <View style={[styles.scrimBand, styles.scrim2]} pointerEvents="none" />
      <View style={[styles.scrimBand, styles.scrim3]} pointerEvents="none" />
      <View style={[styles.scrimBand, styles.scrim4]} pointerEvents="none" />

      {/* Top-right meta — show user's matched category first, then era */}
      <View style={styles.topRow}>
        {(() => {
          const match = matchedCategory(figure.categories, profile?.fields);
          if (!match) return null;
          return (
            <View style={[styles.eraPill, match.matched && styles.eraPillMatched]}>
              <Text style={[styles.eraText, match.matched && styles.eraTextMatched]}>
                {labelFor(match.category)}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Bottom content */}
      <View style={styles.bottomBlock}>
        <Text style={styles.eyebrow}>
          {figure.data.keywords.slice(0, 3).join(' · ')}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {figure.name_ko}
        </Text>
        <Text style={styles.nameEn} numberOfLines={1}>
          {figure.name_en}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.teaser} numberOfLines={2}>
          {teaser}
        </Text>

        <View style={styles.ctaRow}>
          <Text style={[styles.ctaText, locked && styles.ctaTextLocked]}>
            {locked ? '광고 시청 후 열기' : '이야기 열기'}
          </Text>
          <Text style={[styles.ctaArrow, locked && styles.ctaTextLocked]}>→</Text>
        </View>
      </View>

      {locked && (
        <View style={styles.lockBadge} pointerEvents="none">
          <Text style={styles.lockBadgeText}>LOCKED</Text>
        </View>
      )}
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

  // Fake gradient: 얼굴이 덜 가리도록 상단 scrim 약화, 하단 텍스트 영역만 어둡게
  scrim1: { backgroundColor: 'rgba(9, 11, 18, 0.15)' },
  scrimBand: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrim2: { height: '45%', backgroundColor: 'rgba(9, 11, 18, 0.5)' },
  scrim3: { height: '32%', backgroundColor: 'rgba(9, 11, 18, 0.75)' },
  scrim4: { height: '22%', backgroundColor: 'rgba(9, 11, 18, 0.92)' },

  topRow: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  eraPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    backgroundColor: 'rgba(9, 11, 18, 0.55)',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(217, 179, 106, 0.4)',
  },
  eraPillMatched: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  eraPillMuted: {
    borderColor: colors.border,
  },
  eraText: { ...type.label, color: colors.gold, fontSize: 10 },
  eraTextMatched: { color: colors.bg, fontWeight: '700' },
  eraTextMuted: { color: colors.textSecondary },

  bottomBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
  },
  eyebrow: { ...type.label, color: colors.gold, marginBottom: spacing.sm },
  name: { ...type.heroKo, color: colors.text, fontSize: 30, lineHeight: 36 },
  nameEn: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  divider: {
    height: 1,
    width: 40,
    backgroundColor: colors.gold,
    marginVertical: spacing.md,
  },
  quote: { ...type.quoteKo, color: colors.text, fontSize: 17, lineHeight: 26, marginBottom: spacing.sm },
  teaser: { ...type.bodyKo, color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ctaText: { color: colors.gold, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  ctaArrow: { color: colors.gold, fontSize: 16 },
  ctaTextLocked: { color: colors.textSecondary },

  lockBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(9, 11, 18, 0.75)',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockBadgeText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
});
