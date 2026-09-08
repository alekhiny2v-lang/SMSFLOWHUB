/**
 * Country name → flag emoji resolution.
 *
 * Nothing here is hardcoded per-country-name beyond a small alias table for
 * spellings `Intl.DisplayNames` does not produce ("USA", "Turkey", "Burma"…).
 * The full ISO-3166 index is built once from the platform's own locale data by
 * scanning every two-letter region code, so *any* country name a user types
 * (English, with or without diacritics, "Islamic Republic of Pakistan",
 * "Côte d'Ivoire", "Viet Nam"…) resolves to its flag automatically.
 */

/** Spellings `Intl.DisplayNames` does not return, or short forms users type. */
const ALIASES: Record<string, string> = {
  usa: "US",
  "united states of america": "US",
  america: "US",
  uk: "GB",
  britain: "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  russia: "RU",
  "russian federation": "RU",
  uae: "AE",
  emirates: "AE",
  "united arab emirates": "AE",
  korea: "KR",
  "south korea": "KR",
  "republic of korea": "KR",
  "north korea": "KP",
  vietnam: "VN",
  "viet nam": "VN",
  turkey: "TR",
  turkiye: "TR",
  "islamic republic of iran": "IR",
  "islamic republic of pakistan": "PK",
  pakistan: "PK",
  bangladesh: "BD",
  "people s republic of bangladesh": "BD",
  india: "IN",
  bharat: "IN",
  burma: "MM",
  laos: "LA",
  syria: "SY",
  "syrian arab republic": "SY",
  vatican: "VA",
  "holy see": "VA",
  "hong kong": "HK",
  "hong kong sar": "HK",
  macau: "MO",
  macao: "MO",
  palestine: "PS",
  "palestinian territories": "PS",
  "dr congo": "CD",
  "congo kinshasa": "CD",
  "democratic republic of the congo": "CD",
  "congo brazzaville": "CG",
  "republic of the congo": "CG",
  "czech republic": "CZ",
  czechia: "CZ",
  "ivory coast": "CI",
  "cote d ivoire": "CI",
  "saint vincent": "VC",
  "st vincent": "VC",
  grenadines: "VC",
  "saint lucia": "LC",
  "st lucia": "LC",
  "saint kitts": "KN",
  "st kitts": "KN",
  nevis: "KN",
  kosovo: "XK",
  "cape verde": "CV",
  "cabo verde": "CV",
  "east timor": "TL",
  "timor leste": "TL",
  swaziland: "SZ",
  eswatini: "SZ",
  holland: "NL",
  "south africa": "ZA",
  "republic of south africa": "ZA",
  "trinidad and tobago": "TT",
  bosnia: "BA",
  "bosnia and herzegovina": "BA",
  herzegovina: "BA",
  "us virgin islands": "VI",
  "u s virgin islands": "VI",
  "british virgin islands": "VG",
  "cocos islands": "CC",
  "cocos keeling islands": "CC",
  "falkland islands": "FK",
  malvinas: "FK",
  "pitcairn islands": "PN",
  "saint helena": "SH",
  "western sahara": "EH",
  "south sudan": "SS",
  "central african republic": "CF",
  "dominican republic": "DO",
  "papua new guinea": "PG",
  "equatorial guinea": "GQ",
  "guinea bissau": "GW",
  "new zealand": "NZ",
  "kingdom of saudi arabia": "SA",
  "united republic of tanzania": "TZ",
  "north macedonia": "MK",
  "bolivarian republic of venezuela": "VE",
  "plurinational state of bolivia": "BO",
  "united states minor outlying islands": "UM",
  "micronesia": "FM",
  "federated states of micronesia": "FM",
  "moldova": "MD",
  "republic of moldova": "MD",
  "vatican city": "VA",
  "sao tome and principe": "ST",
  "st pierre and miquelon": "PM",
  "us": "US",
  "gb": "GB",
};

/**
 * Codes that are *not* real ISO-3166-1 alpha-2 entries but that CLDR still
 * resolves to a modern country name (BU → "Myanmar (Burma)", DD → "Germany",
 * UK → "United Kingdom"…). They sort before the real code, so without this
 * block a typed name could resolve to a retired code and render the wrong flag.
 */
const EXCLUDED_CODES = new Set([
  "AN", "BU", "CP", "CS", "DD", "DG", "DY", "EA", "EZ", "FX", "HV", "IC",
  "MI", "NH", "NT", "PU", "PZ", "QU", "RH", "SF", "SU", "TA", "TP", "UK",
  "UN", "VD", "YD", "YU", "ZR",
]);

/** Words that carry no signal when matching a typed country name. */
const NOISE_WORDS = [
  "islamic republic of",
  "people s democratic republic of",
  "people s republic of",
  "democratic republic of the",
  "democratic republic of",
  "federal republic of",
  "united republic of",
  "bolivarian republic of",
  "plurinational state of",
  "federated states of",
  "republic of the",
  "sultanate of",
  "kingdom of",
  "state of",
  "states of",
  "federation of",
  "province of",
  "republic of",
  "republic",
  "federation",
  "democratic",
  "islamic",
  "sar china",
  "sar",
];

const FALLBACK_FLAG = "🌍";
const REGIONAL_INDICATOR_OFFSET = 127397;

let index: Map<string, string> | null = null;
let knownCodes: Set<string> | null = null;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addEntry(map: Map<string, string>, name: string, code: string) {
  const key = normalize(name);
  if (key) map.set(key, code);
}

/**
 * Build the lookup table once per process / tab.
 *
 * `Intl.DisplayNames` ships with every modern browser and Node build, so we
 * enumerate AA…ZZ and keep whatever the platform resolves. Codes the platform
 * does not know throw a RangeError and are skipped.
 */
function buildIndex(): Map<string, string> {
  const map = new Map<string, string>();
  const codes = new Set<string>();

  // Aliases first: they win over the platform's longer official spellings.
  for (const [name, code] of Object.entries(ALIASES)) addEntry(map, name, code);

  const DisplayNames = (Intl as typeof Intl & { DisplayNames?: typeof Intl.DisplayNames }).DisplayNames;
  if (DisplayNames) {
    try {
      const display = new DisplayNames(["en"], { type: "region" });
      for (let a = 65; a <= 90; a++) {
        for (let b = 65; b <= 90; b++) {
          const code = String.fromCharCode(a) + String.fromCharCode(b);
          if (EXCLUDED_CODES.has(code)) continue;
          try {
            const name = display.of(code);
            if (!name || name === code) continue;
            codes.add(code);
            if (!map.has(normalize(name))) addEntry(map, name, code);
          } catch {
            // Not an assigned region code — skip.
          }
        }
      }
    } catch {
      // No locale data: fall back to the alias table only.
    }
  }

  // Always keep the alias codes, even when Intl is unavailable.
  for (const code of Object.values(ALIASES)) codes.add(code);

  index = map;
  knownCodes = codes;
  return map;
}

function entries(): Map<string, string> {
  return index ?? buildIndex();
}

function isKnownCode(code: string): boolean {
  if (!knownCodes) buildIndex();
  return knownCodes!.has(code);
}

/** Turn a two-letter ISO code into its flag emoji. */
export function flagFromCode(code?: string | null): string {
  if (!code || code.length !== 2) return FALLBACK_FLAG;
  const upper = code.toUpperCase();
  try {
    return String.fromCodePoint(...[...upper].map((char) => char.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET));
  } catch {
    return FALLBACK_FLAG;
  }
}

/** Every spelling we strip before trying a looser match. */
function variants(key: string): string[] {
  const out = [key];
  let current = key;
  for (const noise of NOISE_WORDS) {
    const prefix = `${noise} `;
    if (current.startsWith(prefix)) current = current.slice(prefix.length);
    else if (current.endsWith(` ${noise}`)) current = current.slice(0, -noise.length - 1);
  }
  if (current !== key) out.push(current.trim());

  const withoutThe = current.replace(/^the\s+/, "").trim();
  if (withoutThe && withoutThe !== current) out.push(withoutThe);

  return out.filter(Boolean);
}

/**
 * Resolve almost any country input — ISO-2, ISO-3, or a free-text English name
 * — into its ISO-3166-1 alpha-2 code. Returns null when nothing matches.
 */
export function getCountryCode(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  if (/^[a-zA-Z]{2}$/.test(raw)) {
    const code = raw.toUpperCase();
    if (isKnownCode(code) || ALIASES[normalize(raw)]) return ALIASES[normalize(raw)] ?? code;
  }

  const map = entries();
  const key = normalize(raw);
  if (!key) return null;

  const direct = map.get(key);
  if (direct) return direct;

  // ISO-3 and other spellings Intl understands but we have not indexed.
  if (/^[a-zA-Z]{3}$/.test(raw)) {
    const DisplayNames = (Intl as typeof Intl & { DisplayNames?: typeof Intl.DisplayNames }).DisplayNames;
    if (DisplayNames) {
      try {
        const name = new DisplayNames(["en"], { type: "region" }).of(raw.toUpperCase());
        if (name && name !== raw.toUpperCase()) {
          const resolved = map.get(normalize(name));
          if (resolved) return resolved;
        }
      } catch {
        // Not a region code.
      }
    }
  }

  // Strip "Islamic Republic of …" style noise and retry against the index.
  for (const variant of variants(key)) {
    const match = map.get(variant);
    if (match) return match;
  }

  // Last resort: unambiguous prefix / substring match, shortest name wins.
  let best: { code: string; length: number } | null = null;
  for (const variant of variants(key)) {
    if (variant.length < 3) continue;
    for (const [name, code] of map) {
      if (name === variant) return code;
      if (name.startsWith(variant) || variant.startsWith(name)) {
        if (!best || name.length < best.length) best = { code, length: name.length };
      }
    }
    if (best) return best.code;
  }

  return null;
}

/**
 * Flag emoji for anything: an ISO code (2 or 3 letters) or a country name.
 * Typing "Pakistan", "pk", "PAK" or "Islamic Republic of Pakistan" all work.
 */
export function getCountryFlag(input?: string | null): string {
  const code = getCountryCode(input);
  return code ? flagFromCode(code) : FALLBACK_FLAG;
}

/** Backwards-compatible alias — every caller may now pass a code too. */
export function getCountryFlagByName(name?: string | null): string {
  return getCountryFlag(name);
}

/** Best-effort ISO-2 code for a stored country row (code wins, name is fallback). */
export function resolveCountryCode(code?: string | null, name?: string | null): string | null {
  return getCountryCode(code) ?? getCountryCode(name);
}
