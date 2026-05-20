/**
 * Ad service — MockAdModal only for now.
 * react-native-google-mobile-ads has Gradle compatibility issues with the
 * current build setup; real AdMob will be wired in a separate build once
 * the native module issue is resolved.
 */

export const isAdMobAvailable = false;

export function preloadAd(): void {
  // no-op until native AdMob is re-enabled
}

export function showInterstitial(): Promise<void> {
  return Promise.resolve();
}
