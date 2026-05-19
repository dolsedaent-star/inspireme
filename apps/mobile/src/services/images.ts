/**
 * Normalize image URLs that come back from Wikipedia summary API.
 * Some leads point at 3840px (or larger) thumbnails which Android Image
 * struggles to decode. Rewrite the size segment to a sane width.
 */
export function thumbUrl(url: string | null | undefined, width = 800): string | null {
  if (!url) return null;
  // /1234px-Filename.jpg → /<width>px-Filename.jpg
  const sized = url.replace(/\/(\d{3,5})px-/, `/${width}px-`);
  // Some originalimage URLs aren't sized at all; strip tracking query.
  return sized.split('?')[0];
}

/**
 * Wikimedia's User-Agent policy returns 403 for requests with empty or
 * generic UAs. Include identifying info per:
 * https://meta.wikimedia.org/wiki/User-Agent_policy
 */
export const WIKI_HEADERS = {
  'User-Agent': 'InspireMe/0.1 (https://github.com/dolsedaent-star/inspireme; dolsedaent@gmail.com)',
} as const;

/** Build the full Image source object (uri + headers) from a Wikimedia URL. */
export function wikiImageSource(url: string | null | undefined, width = 800) {
  const uri = thumbUrl(url, width);
  if (!uri) return null;
  return { uri, headers: { ...WIKI_HEADERS } };
}
