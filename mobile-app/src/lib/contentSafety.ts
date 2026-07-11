const WARNING = 'Bu alanda ahlak kurallarına uygun olmayan kelime veya ifade kullanılamaz. Lütfen yazını düzelt.';

const COMPACT_TERMS = [
  'motherfucker', 'sonofabitch', 'bullshit', 'asshole', 'dickhead', 'shithead',
  'fuckface', 'fuckyou', 'fucker', 'fucking', 'fuck', 'bastard', 'bitch', 'slut',
  'whore', 'pussy', 'dick', 'cock', 'wanker', 'idiot', 'stupid', 'moron',
  'retard', 'retarded', 'loser', 'scumbag',
  'aminakoyim', 'aminakodum', 'aminakoy', 'aminakod', 'amcik', 'amcuk',
  'orospu', 'oruspu', 'siktir', 'sikerim', 'sikeyim', 'sikik', 'sikim',
  'sokuk', 'gotveren', 'gotun', 'yarrak', 'yarak', 'yarraq', 'pezevenk',
  'kahpe', 'kaltak', 'gerizekali', 'gerizekalli', 'salak', 'aptal', 'ibne',
  'pic', 'pich', 'puşt', 'pust', 'haysiyetsiz', 'serefsiz', 'şerefsiz',
  'asagilik', 'aşağılık',
];

const TOKEN_TERMS = ['amk', 'aq', 'got', 'bok', 'mal', 'damn', 'crap'];

const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '0': 'o',
  '5': 's',
  '$': 's',
  '7': 't',
};

type SafetyField = {
  label: string;
  value: string | number | null | undefined;
};

function normalizeContentSafetyText(value: unknown) {
  const spaced = String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u')
    .replace(/[âîû]/g, (match) => ({ 'â': 'a', 'î': 'i', 'û': 'u' }[match] ?? match))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@431!|05$7]/g, (match) => LEET_MAP[match] ?? match)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const tokens = spaced ? spaced.split(/\s+/).filter(Boolean) : [];
  return {
    spaced,
    tokens,
    compact: tokens.join(''),
  };
}

function findContentSafetyViolation(value: unknown) {
  const normalized = normalizeContentSafetyText(value);
  if (!normalized.compact) return null;

  const compactTerms = COMPACT_TERMS
    .map((term) => normalizeContentSafetyText(term).compact)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const compactMatch = compactTerms.find((term) => normalized.compact.includes(term));
  if (compactMatch) return compactMatch;

  const tokenTerms = TOKEN_TERMS.map((term) => normalizeContentSafetyText(term).compact).filter(Boolean);
  return tokenTerms.find((term) => normalized.tokens.includes(term) || normalized.compact === term) ?? null;
}

export function validateContentFields(fields: SafetyField[]) {
  const blocked = fields.find((field) => findContentSafetyViolation(field.value));
  if (!blocked) {
    return { ok: true as const };
  }
  return {
    ok: false as const,
    message: WARNING,
    field: blocked.label,
  };
}

export function assertContentFields(fields: SafetyField[]) {
  const result = validateContentFields(fields);
  if (!result.ok) {
    throw new Error(result.message);
  }
}

export const contentSafetyWarning = WARNING;
