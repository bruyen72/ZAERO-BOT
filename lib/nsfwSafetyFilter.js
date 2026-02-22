const DEFAULT_SAFETY_EXCLUDED_TERMS = Object.freeze([
  'gore',
  'snuff',
  'blood',
  'death',
  'corpse',
  'scat',
  'feces',
  'poop',
  'urine',
  'piss',
  'vomit',
  'puke',
  'bestiality',
  'zoophilia',
  'animal-sex',
  'incest',
  'rape',
  'raped',
  'forced',
  'underage',
  'cp',
]);

// Nao permite usar este filtro para exclusao por orientacao sexual/identidade de genero.
const UNSUPPORTED_IDENTITY_PATTERNS = Object.freeze([
  /\bgay(?:s|sex|porn|man|men|boy)?\b/,
  /\btrans(?:gender|sexual|man|men|woman|women)?\b/,
  /\bfemboy(?:s)?\b/,
  /\blesbian(?:s)?\b/,
  /\bbisexual\b/,
  /\bqueer\b/,
  /\blgbtq?\b/,
  /\btwink(?:s)?\b/,
  /\bshemale\b/,
  /\btranny\b/,
  /\bladyboy\b/,
  /\bt-girl\b/,
  /\btgirl\b/,
  /\bts\b/,
]);

function uniqueStrings(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function normalizeTerm(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseEnvBool(value, fallback = true) {
  const normalized = normalizeTerm(value).replace(/-/g, '');
  if (!normalized) return fallback;
  if (['1', 'true', 'on', 'yes', 'y'].includes(normalized)) return true;
  if (['0', 'false', 'off', 'no', 'n'].includes(normalized)) return false;
  return fallback;
}

function parseCsvTerms(value = '') {
  const source = Array.isArray(value) ? value.join(',') : String(value || '');
  if (!source.trim()) return [];

  return uniqueStrings(
    source
      .split(/[,;|\n]+/)
      .map((item) => normalizeTerm(item))
      .filter(Boolean),
  );
}

function isUnsupportedIdentityTerm(term = '') {
  if (!term) return false;
  return UNSUPPORTED_IDENTITY_PATTERNS.some((pattern) => pattern.test(term));
}

export function getNsfwSafetyBlockedTerms(options = {}) {
  const enabled =
    typeof options.enabled === 'boolean'
      ? options.enabled
      : parseEnvBool(process.env.REDGIFS_SAFETY_FILTER, true);
  if (!enabled) return [];

  const includeDefaults =
    typeof options.includeDefaults === 'boolean'
      ? options.includeDefaults
      : parseEnvBool(process.env.REDGIFS_DEFAULT_SAFETY_FILTER, true);

  const rawExtra =
    typeof options.extraTerms === 'string' || Array.isArray(options.extraTerms)
      ? options.extraTerms
      : process.env.REDGIFS_SAFETY_EXCLUDED_TERMS || '';

  const merged = [
    ...(includeDefaults ? DEFAULT_SAFETY_EXCLUDED_TERMS : []),
    ...parseCsvTerms(rawExtra),
  ];

  return uniqueStrings(
    merged
      .map((item) => normalizeTerm(item))
      .filter(Boolean)
      .filter((item) => !isUnsupportedIdentityTerm(item)),
  );
}

export function normalizeBooruTags(value = '') {
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((item) => normalizeTerm(item)).filter(Boolean));
  }

  return uniqueStrings(
    String(value || '')
      .split(/[\s,;|]+/)
      .map((item) => normalizeTerm(item))
      .filter(Boolean),
  );
}

export function isNsfwCandidateBlocked(candidate = {}, blockedTerms = []) {
  const terms = Array.isArray(blockedTerms) ? blockedTerms : [];
  if (!terms.length) return { blocked: false, hit: '' };

  const tags = normalizeBooruTags(candidate.tags || candidate.tag_string || candidate.tagString || []);
  const normalizedText = normalizeTerm(
    [
      ...tags,
      candidate.title || '',
      candidate.description || '',
      candidate.pageUrl || '',
      candidate.url || '',
      candidate.username || '',
    ].join(' '),
  );

  if (!normalizedText) return { blocked: false, hit: '' };

  for (const term of terms) {
    if (!term) continue;
    if (normalizedText.includes(term)) {
      return { blocked: true, hit: term };
    }
  }

  return { blocked: false, hit: '' };
}

