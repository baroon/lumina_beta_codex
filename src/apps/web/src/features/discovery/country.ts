/**
 * Best-effort resolution of a free-text market name to an ISO 3166-1 alpha-2
 * country code (e.g. "France" -> "FR", "USA" -> "US"). Returns null when the
 * name can't be matched to a single country (regions like "Europe", cities,
 * "Global", or unrecognized spellings). Zero-dependency: country names come from
 * the browser's Intl.DisplayNames over the canonical ISO code list, plus a small
 * alias table for common short forms.
 */

// Canonical ISO 3166-1 alpha-2 codes only. Deprecated/transitional codes are
// excluded on purpose — ICU still names some of them after a current country
// (FX -> "France", DD -> "Germany"), which would otherwise collide.
// prettier-ignore
const CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM " +
  "BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX " +
  "CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG " +
  "GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR " +
  "IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV " +
  "LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE " +
  "NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO " +
  "RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF " +
  "TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF " +
  "WS YE YT ZA ZM ZW"
).split(" ");

// Common short forms / aliases not produced by Intl (keys must be normalized).
const ALIASES: Record<string, string> = {
  usa: "US",
  "u s a": "US",
  "u s": "US",
  america: "US",
  "united states of america": "US",
  uk: "GB",
  "u k": "GB",
  britain: "GB",
  "great britain": "GB",
  england: "GB",
  uae: "AE",
  emirates: "AE",
  korea: "KR",
  turkey: "TR",
  holland: "NL",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

let nameToCode: Map<string, string> | null = null;

function buildMap(): Map<string, string> {
  const map = new Map<string, string>();

  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
  } catch {
    // Intl.DisplayNames unavailable (older runtime); fall back to raw codes only.
  }

  for (const code of CODES) {
    if (display) {
      let name: string | undefined;
      try {
        name = display.of(code);
      } catch {
        name = undefined;
      }
      if (name && name !== code) {
        map.set(normalize(name), code);
      }
    }
    map.set(normalize(code), code); // allow typing the raw code
  }

  for (const [alias, code] of Object.entries(ALIASES)) {
    map.set(normalize(alias), code);
  }

  return map;
}

export function resolveCountryCode(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = normalize(name);
  if (!key) return null;
  if (!nameToCode) nameToCode = buildMap();
  return nameToCode.get(key) ?? null;
}
