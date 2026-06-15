/**
 * Builds a flag image URL (flagcdn.com SVG) for an ISO 3166-1 alpha-2 country
 * code, e.g. "US" -> "https://flagcdn.com/us.svg". Returns null when the code is
 * missing or not a valid two-letter code (region/global markets like "Europe"
 * or "Global" have no country code, so they get no flag).
 *
 * Lives in `lib/` (not in any feature folder) so multiple features can import
 * it without crossing the ESLint feature-isolation boundary.
 */
export function countryCodeToFlagUrl(code: string | null | undefined): string | null {
  if (!code) return null;
  const cc = code.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return null;
  return `https://flagcdn.com/${cc}.svg`;
}
