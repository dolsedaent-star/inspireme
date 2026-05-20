import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';
import { wikiImageSource } from '../services/images';

/**
 * Full-bleed photo strip used to break up long detail pages — dark scrim +
 * optional caption gives a magazine pull-quote feel.
 */
export function PhotoBand({
  imageUrl,
  caption,
  height = 220,
  variant = 'wide',
}: {
  imageUrl: string | null;
  caption?: string;
  height?: number;
  variant?: 'wide' | 'tall' | 'mono';
}) {
  if (!imageUrl) return null;
  const source = wikiImageSource(imageUrl, variant === 'tall' ? 1200 : 1000);
  if (!source) return null;
  return (
    <View style={[styles.wrap, { height: variant === 'tall' ? height * 1.4 : height }]}>
      <Image source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.scrim1]} pointerEvents="none" />
      {variant === 'mono' && (
        <View style={[StyleSheet.absoluteFill, styles.mono]} pointerEvents="none" />
      )}
      <View style={[styles.band, styles.scrimBottom]} pointerEvents="none" />
      {caption && (
        <View style={styles.captionWrap}>
          <View style={styles.captionBar} />
          <Text style={styles.captionText}>{caption}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    borderRadius: 4,
  },
  scrim1: { backgroundColor: 'rgba(9, 11, 18, 0.25)' },
  mono: { backgroundColor: 'rgba(9, 11, 18, 0.35)' },
  band: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrimBottom: { height: '55%', backgroundColor: 'rgba(9, 11, 18, 0.85)' },
  captionWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  captionBar: { width: 3, alignSelf: 'stretch', backgroundColor: colors.gold, marginTop: 4 },
  captionText: { ...type.quoteKo, color: colors.text, fontSize: 18, lineHeight: 26, flex: 1 },
});
