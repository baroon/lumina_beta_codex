/**
 * Converts an ISO 3166-1 alpha-2 country code (e.g. "US") to its flag emoji.
 * Returns null when the code is missing or not a valid two-letter code
 * (e.g. region/global markets like "Europe" or "Global" have no country code).
 */
export function countryCodeToFlag(code: string | null | undefined): string | null {
  if (!code) return null;
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;

  const REGIONAL_INDICATOR_A = 0x1f1e6;
  const A = "A".charCodeAt(0);
  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + (cc.charCodeAt(0) - A),
    REGIONAL_INDICATOR_A + (cc.charCodeAt(1) - A),
  );
}
