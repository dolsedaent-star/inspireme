/**
 * react-native-svg ships class component types that React 19 rejects at the
 * JSX call site. Until upstream fixes types, we re-export the primitives we
 * use as plain function-component types. Runtime is unchanged.
 */
import type { ComponentType } from 'react';
import RNSvg, {
  Circle as RNCircle,
  Line as RNLine,
  Path as RNPath,
  Rect as RNRect,
  Text as RNSvgText,
  Defs as RNDefs,
  LinearGradient as RNLinearGradient,
  Stop as RNStop,
  type SvgProps,
  type CircleProps,
  type LineProps,
  type PathProps,
  type RectProps,
  type TextProps as SvgTextProps,
  type LinearGradientProps,
  type StopProps,
} from 'react-native-svg';

export const Svg = RNSvg as unknown as ComponentType<SvgProps>;
export const Circle = RNCircle as unknown as ComponentType<CircleProps>;
export const Line = RNLine as unknown as ComponentType<LineProps>;
export const Path = RNPath as unknown as ComponentType<PathProps>;
export const Rect = RNRect as unknown as ComponentType<RectProps>;
export const SvgText = RNSvgText as unknown as ComponentType<SvgTextProps>;
export const Defs = RNDefs as unknown as ComponentType<Record<string, unknown>>;
export const SvgLinearGradient = RNLinearGradient as unknown as ComponentType<LinearGradientProps>;
export const Stop = RNStop as unknown as ComponentType<StopProps>;
