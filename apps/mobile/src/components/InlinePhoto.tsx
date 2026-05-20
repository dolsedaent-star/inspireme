import { Image, StyleSheet, Text, View } from 'react-native';
import { wikiImageSource } from '../services/images';
import { colors, radii, spacing, type } from '../theme';

interface InlinePhotoProps {
  url: string;
  label?: string;
  aspect?: number; // height = width * aspect; default ~0.65 (landscape-ish portrait)
}

export function InlinePhoto({ url, label, aspect = 0.65 }: InlinePhotoProps) {
  const src = wikiImageSource(url, 900);
  if (!src) return null;
  return (
    <View style={styles.wrap}>
      <View style={[styles.imgWrap, { aspectRatio: 1 / aspect }]}>
        <Image source={src} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, styles.scrim]} pointerEvents="none" />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  imgWrap: {
    width: '100%',
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrim: {
    backgroundColor: 'rgba(9,11,18,0.12)',
  },
  label: {
    ...type.caption,
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'right',
  },
});
