// ============================================================
// lib/sciences/fiches-outils/unites.ts
// ============================================================

export type FicheMode = 'normal' | 'advanced';

export type SectionId =
  | 'toSI'
  | 'toPrefix'
  | 'mixed'
  | 'toSci'
  | 'fromSci'
  | 'mixedFull'
  | 'composed';

export interface SectionDef {
  id: SectionId;
  label: string;
  description: string;
  example: string;
  columns: ('prefix' | 'si' | 'sci')[];
  mode: FicheMode | 'both';
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'toSI',
    label: 'Préfixe → SI',
    description: 'Convertir une valeur avec préfixe vers l\'unité SI',
    example: '12 km → 12 000 m  ·  45 mA → 0,045 A  ·  3,2 μs → 0,0000032 s',
    columns: ['prefix', 'si'],
    mode: 'both',
  },
  {
    id: 'toPrefix',
    label: 'SI → préfixe',
    description: 'Exprimer une valeur SI dans l\'unité usuelle la plus proche',
    example: '0,003 m → 3 mm  ·  12 000 W → 12 kW  ·  0,000045 s → 45 μs',
    columns: ['si', 'prefix'],
    mode: 'both',
  },
  {
    id: 'mixed',
    label: 'Mixte',
    description: 'Conversion dans les deux sens — préfixe ↔ SI',
    example: '250 ms → ? s  ou  0,0042 N → ? mN  ·  La colonne donnée varie',
    columns: ['prefix', 'si'],
    mode: 'normal',
  },
  {
    id: 'toSci',
    label: 'SI → notation sci.',
    description: 'Exprimer la valeur SI en notation scientifique',
    example: '0,0042 m → 4,2×10⁻³ m  ·  12 000 W → 1,2×10⁴ W',
    columns: ['si', 'sci'],
    mode: 'advanced',
  },
  {
    id: 'fromSci',
    label: 'Sci. → SI + préfixe',
    description: 'Lire une notation scientifique, trouver la valeur SI et l\'unité préfixée',
    example: '3,5×10⁻³ A → 0,0035 A → 3,5 mA',
    columns: ['sci', 'si', 'prefix'],
    mode: 'advanced',
  },
  {
    id: 'mixedFull',
    label: 'Mixte complet',
    description: 'Les 3 colonnes, colonne donnée aléatoire',
    example: 'Colonne donnée aléatoire — trouver les deux autres',
    columns: ['prefix', 'si', 'sci'],
    mode: 'advanced',
  },
  {
    id: 'composed',
    label: 'Unités composées',
    description: 'Conversions avec m/s, N·m, V/m…',
    example: '3,6 km/s → 3 600 m/s  ·  250 mN·m → 0,25 N·m',
    columns: ['prefix', 'si'],
    mode: 'both',
  },
];

export function getSections(mode: FicheMode): SectionDef[] {
  return SECTIONS.filter(s => s.mode === 'both' || s.mode === mode);
}

// ── Préfixes ─────────────────────────────────────────────────
export const PREFIXES = [
  { name: 'Nano',  sym: 'n',  exp: -9 },
  { name: 'Micro', sym: 'μ',  exp: -6 },
  { name: 'Milli', sym: 'm',  exp: -3 },
  { name: 'Centi', sym: 'c',  exp: -2 },
  { name: 'Déci',  sym: 'd',  exp: -1 },
  { name: 'Déca',  sym: 'da', exp:  1 },
  { name: 'Hecto', sym: 'h',  exp:  2 },
  { name: 'Kilo',  sym: 'k',  exp:  3 },
  { name: 'Méga',  sym: 'M',  exp:  6 },
  { name: 'Giga',  sym: 'G',  exp:  9 },
] as const;

const COMMON_PREFIXES = PREFIXES.filter(p =>
  ['n', 'μ', 'm', 'c', 'k', 'M', 'G'].includes(p.sym)
);

const ALL_PREFIXES_WITH_BASE = [
  ...PREFIXES,
  { name: 'Base', sym: '', exp: 0 },
];

// ── Unités simples (sans Ω) ───────────────────────────────────
export interface UnitDef {
  displayBase: string;
  siBase: string;
  siOffset: number;
  label: string;
}

export const SIMPLE_UNITS: UnitDef[] = [
  { displayBase: 'm',  siBase: 'm',  siOffset: 1,    label: 'longueur' },
  { displayBase: 'g',  siBase: 'kg', siOffset: 1e-3, label: 'masse' },
  { displayBase: 's',  siBase: 's',  siOffset: 1,    label: 'temps' },
  { displayBase: 'N',  siBase: 'N',  siOffset: 1,    label: 'force' },
  { displayBase: 'W',  siBase: 'W',  siOffset: 1,    label: 'puissance' },
  { displayBase: 'J',  siBase: 'J',  siOffset: 1,    label: 'énergie' },
  { displayBase: 'V',  siBase: 'V',  siOffset: 1,    label: 'tension' },
  { displayBase: 'A',  siBase: 'A',  siOffset: 1,    label: 'intensité' },
  { displayBase: 'Pa', siBase: 'Pa', siOffset: 1,    label: 'pression' },
  { displayBase: 'T',  siBase: 'T',  siOffset: 1,    label: 'champ B' },
  { displayBase: 'Hz', siBase: 'Hz', siOffset: 1,    label: 'fréquence' },
];

// ── Unités composées ──────────────────────────────────────────
export interface ComposedUnitDef {
  siUnit: string;
  prefixTarget: string;
  suffix: string;
  targetSiOffset: number;
  label: string;
}

export const COMPOSED_UNITS: ComposedUnitDef[] = [
  { siUnit: 'm/s',  prefixTarget: 'm', suffix: '/s',  targetSiOffset: 1,   label: 'vitesse' },
  { siUnit: 'm/s²', prefixTarget: 'm', suffix: '/s²', targetSiOffset: 1,   label: 'accélération' },
  { siUnit: 'N·m',  prefixTarget: 'N', suffix: '·m',  targetSiOffset: 1,   label: 'moment' },
  { siUnit: 'N/kg', prefixTarget: 'N', suffix: '/kg', targetSiOffset: 1,   label: 'pesanteur' },
  { siUnit: 'V/m',  prefixTarget: 'V', suffix: '/m',  targetSiOffset: 1,   label: 'champ E' },
  { siUnit: 'J/kg', prefixTarget: 'J', suffix: '/kg', targetSiOffset: 1,   label: 'énergie massique' },
];

// ── ExRow ─────────────────────────────────────────────────────
export interface ExRow {
  given: 'prefix' | 'si' | 'sci';
  givenDisplay: string;
  siValue: number;
  siUnit: string;
  prefixSym: string;
  prefixExp: number;
  mantissa: number;
  answerPrefix: string;
  answerSI: string;
  answerSci: string;
  acceptedPrefixes?: { sym: string; exp: number; mantissa: number }[];
}

// ── Helpers ───────────────────────────────────────────────────
function rand(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randMantissa(): number {
  const sigs = rand(1, 4);
  const mag = Math.pow(10, sigs - 1);
  const raw = rand(mag, mag * 10 - 1) / Math.pow(10, sigs - 1);
  return parseFloat(raw.toPrecision(sigs));
}

// ── Formatage ─────────────────────────────────────────────────
export function supStr(e: number): string {
  if (e === 0) return '';
  const map: Record<string, string> = {
    '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
    '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻',
  };
  return '×10' + String(e).split('').map(c => map[c] ?? c).join('');
}

export function toSciDisplay(n: number, unit: string): string {
  if (n === 0) return '0 ' + unit;
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const m = n / Math.pow(10, exp);
  return parseFloat(m.toPrecision(4)).toString().replace('.', ',') + supStr(exp) + ' ' + unit;
}

export function toDecimalDisplay(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 0.001 && abs < 1e7) {
    return parseFloat(n.toPrecision(6)).toString().replace('.', ',');
  }
  return toSciDisplay(n, '').trim();
}

export function parseInput(s: string): number | null {
  if (!s?.trim()) return null;
  let t = s.trim()
    .replace(',', '.')
    .replace(/\s/g, '')
    .replace(/[×xX*]/g, 'e')
    .replace(/\^/g, '');
  const sup: Record<string, string> = {
    '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4',
    '⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-',
  };
  t = t.split('').map(c => sup[c] ?? c).join('');
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
}

export function approxEq(a: number, b: number, tol = 0.005): boolean {
  if (a === 0 && b === 0) return true;
  if (a === 0 || b === 0) return Math.abs(a - b) < 1e-12;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) < tol;
}

export function naturalPrefixes(
  siValue: number,
  siOffset: number
): { sym: string; exp: number; mantissa: number }[] {
  const results: { sym: string; exp: number; mantissa: number }[] = [];
  for (const p of ALL_PREFIXES_WITH_BASE) {
    const displayVal = siValue / siOffset;
    const prefixedVal = displayVal / Math.pow(10, p.exp);
    if (prefixedVal >= 0.1 && prefixedVal < 1000) {
      results.push({
        sym: p.sym,
        exp: p.exp,
        mantissa: parseFloat(prefixedVal.toPrecision(4)),
      });
    }
  }
  return results;
}

// ── Génération ────────────────────────────────────────────────
function makeSimpleRow(sectionId: SectionId, unit: UnitDef): ExRow {
  const pool = (sectionId === 'toSI' || sectionId === 'mixed' || sectionId === 'mixedFull')
    ? [...COMMON_PREFIXES, ...PREFIXES.filter(p => p.sym === 'da' || p.sym === 'h')]
    : COMMON_PREFIXES;

  const pre = pick(pool as typeof COMMON_PREFIXES);
  const mantissa = randMantissa();
  const displayBaseVal = mantissa * Math.pow(10, pre.exp);
  const siValue = displayBaseVal * unit.siOffset;

  const prefixedDisplay = `${toDecimalDisplay(mantissa)} ${pre.sym}${unit.displayBase}`;
  const siDisplay       = `${toDecimalDisplay(siValue)} ${unit.siBase}`;
  const sciDisplay      = toSciDisplay(siValue, unit.siBase);
  const acceptedPrefixes = naturalPrefixes(siValue, unit.siOffset);

  let given: ExRow['given'];
  switch (sectionId) {
    case 'toSI':     given = 'prefix'; break;
    case 'toPrefix': given = 'si';     break;
    case 'toSci':    given = 'si';     break;
    case 'fromSci':  given = 'sci';    break;
    case 'mixed':    given = pick(['prefix', 'si'] as const); break;
    default:         given = pick(['prefix', 'si', 'sci'] as const);
  }

  return {
    given,
    givenDisplay: given === 'prefix' ? prefixedDisplay : given === 'si' ? siDisplay : sciDisplay,
    siValue,
    siUnit: unit.siBase,
    prefixSym: pre.sym,
    prefixExp: pre.exp,
    mantissa,
    answerPrefix: prefixedDisplay,
    answerSI: siDisplay,
    answerSci: sciDisplay,
    acceptedPrefixes,
  };
}

function makeComposedRow(sectionId: SectionId): ExRow {
  const unit = pick(COMPOSED_UNITS);
  const pre  = pick(COMMON_PREFIXES);
  const mantissa = randMantissa();
  const siValue  = mantissa * Math.pow(10, pre.exp) * unit.targetSiOffset;

  const prefixedUnit    = `${pre.sym}${unit.prefixTarget}${unit.suffix}`;
  const prefixedDisplay = `${toDecimalDisplay(mantissa)} ${prefixedUnit}`;
  const siDisplay       = `${toDecimalDisplay(siValue)} ${unit.siUnit}`;
  const sciDisplay      = toSciDisplay(siValue, unit.siUnit);

  const given: ExRow['given'] = sectionId === 'toSI' ? 'prefix'
    : sectionId === 'toPrefix' ? 'si'
    : pick(['prefix', 'si'] as const);

  return {
    given,
    givenDisplay: given === 'prefix' ? prefixedDisplay : given === 'si' ? siDisplay : sciDisplay,
    siValue, siUnit: unit.siUnit,
    prefixSym: pre.sym, prefixExp: pre.exp, mantissa,
    answerPrefix: prefixedDisplay,
    answerSI: siDisplay,
    answerSci: sciDisplay,
    acceptedPrefixes: [{ sym: pre.sym, exp: pre.exp, mantissa }],
  };
}

export const ROW_COUNT = 10;

export function generateRows(sectionId: SectionId, count: number = ROW_COUNT): ExRow[] {
  const rows: ExRow[] = [];
  for (let i = 0; i < count; i++) {
    rows.push(sectionId === 'composed'
      ? makeComposedRow(sectionId)
      : makeSimpleRow(sectionId, pick(SIMPLE_UNITS))
    );
  }
  return rows;
}

// ── Seuils de score ───────────────────────────────────────────
export type ScoreLevel = 'not_done' | 'redo' | 'advise_redo' | 'succeeded';

export function scoreLevel(pct: number): ScoreLevel {
  if (pct >= 85) return 'succeeded';
  if (pct >= 70) return 'advise_redo';
  if (pct >= 40) return 'redo';
  return 'not_done';
}

export const SCORE_LEVEL_LABELS: Record<ScoreLevel, string> = {
  not_done:    'À refaire',
  redo:        'À refaire',
  advise_redo: 'Conseil de refaire',
  succeeded:   'Réussi',
};

export const SCORE_LEVEL_COLORS: Record<ScoreLevel, { bg: string; text: string; border: string }> = {
  not_done:    { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' },
  redo:        { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' },
  advise_redo: { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775' },
  succeeded:   { bg: '#EAF3DE', text: '#3B6D11', border: '#C0DD97' },
};