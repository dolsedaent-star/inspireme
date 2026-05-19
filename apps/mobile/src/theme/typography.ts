export const fonts = {
  display: 'PlayfairDisplay-Regular',
  displayBold: 'PlayfairDisplay-Bold',
  displayItalic: 'PlayfairDisplay-Italic',
  body: 'Pretendard-Regular',
  bodySemiBold: 'Pretendard-SemiBold',
  bodyBold: 'Pretendard-Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 50, letterSpacing: -0.5 },
  heroKo: { fontFamily: fonts.bodyBold, fontSize: 38, lineHeight: 46, letterSpacing: -0.5 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34 },
  titleKo: { fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  section: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 2 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyKo: { fontFamily: fonts.body, fontSize: 16, lineHeight: 26 },
  quote: { fontFamily: fonts.displayItalic, fontSize: 22, lineHeight: 32 },
  quoteKo: { fontFamily: fonts.body, fontSize: 20, lineHeight: 30 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.5 },
} as const;
