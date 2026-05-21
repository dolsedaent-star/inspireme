import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Svg, Path } from './svg';
import { colors, radii, spacing, type } from '../theme';

/**
 * Loading placeholder while a figure card is being generated.
 *
 * Visual: silhouette of a head drawn in gold, with a horizontal fill rising
 * from the bottom over ~5 seconds and looping. Designed to be swapped for a
 * Lottie file later — the user mentioned they'll provide one.
 */
export function FaceFillPlaceholder({ caption }: { caption?: string }) {
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fill, {
          toValue: 1,
          duration: 5000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(fill, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [fill]);

  // Inner fill bar height = 0% → 100% from bottom
  const fillHeight = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.card}>
      <View style={styles.silhouetteWrap}>
        {/* Outer silhouette outline (gold) */}
        <Svg width={120} height={140} viewBox="0 0 120 140">
          <Path
            d="M60 16 C40 16 28 32 28 52 C28 66 34 78 44 84 L44 88 C30 92 14 102 14 124 L14 140 L106 140 L106 124 C106 102 90 92 76 88 L76 84 C86 78 92 66 92 52 C92 32 80 16 60 16 Z"
            stroke="rgba(217, 179, 106, 0.55)"
            strokeWidth={2}
            fill="rgba(217, 179, 106, 0.08)"
          />
        </Svg>

        {/* Rising fill — clipped to the silhouette shape by overflow */}
        <View style={styles.fillContainer} pointerEvents="none">
          <Animated.View style={[styles.fillBar, { height: fillHeight }]} />
        </View>

        {/* Inner silhouette mask — same shape stroked again, on top so the
            fill appears "inside" the figure */}
        <View style={styles.maskOverlay} pointerEvents="none">
          <Svg width={120} height={140} viewBox="0 0 120 140">
            <Path
              d="M60 16 C40 16 28 32 28 52 C28 66 34 78 44 84 L44 88 C30 92 14 102 14 124 L14 140 L106 140 L106 124 C106 102 90 92 76 88 L76 84 C86 78 92 66 92 52 C92 32 80 16 60 16 Z"
              stroke="rgba(217, 179, 106, 0.9)"
              strokeWidth={2}
              fill="transparent"
            />
          </Svg>
        </View>
      </View>

      <Text style={styles.label}>새 위인을 모셔오는 중…</Text>
      {caption && <Text style={styles.caption}>{caption}</Text>}
    </View>
  );
}

const CARD_W = 120;
const CARD_H = 140;

const styles = StyleSheet.create({
  card: {
    height: 460,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  silhouetteWrap: { width: CARD_W, height: CARD_H, alignItems: 'center', justifyContent: 'center' },
  fillContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: CARD_H,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  fillBar: {
    width: CARD_W - 8,
    backgroundColor: 'rgba(217, 179, 106, 0.35)',
  },
  maskOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.label, color: colors.gold },
  caption: { ...type.caption, color: colors.textSecondary, fontSize: 12 },
});
