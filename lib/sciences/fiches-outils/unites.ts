// ============================================================
// lib/fiches-outils/unites.ts
// Génération des exercices "Contrat — Unités"
// ============================================================

export type SectionId =
  | 'toSI'        // préfixé → SI
  | 'toPrefix'    // SI → unité usuelle la plus proche
  | 'toSci'       // SI → notation scientifique
  | 'fromSci'     // notation scientifique → SI + préfixe
  | 'mixed'       // mélange des 4 ci-dessus (unités simples)
  | 'composed';   // unités composées (m/s, N·m…)

export interface ExRow {
  /** Colonne donnée : 'prefix' | 'si' | 'sci' */
  given: 'prefix' | 'si' | 'sci';
  /** Valeur affichée dans la colonne donnée */
  givenDisplay: string;
  /** Valeur SI numérique (référence de vérification) */
  siValue: number;
  /** Unité SI (ex: 'm', 'kg', 'N·m') */
  siUnit: string;
  /** Préfixe utilisé */
  prefixSym: string;
  prefixExp: number;
  /** Mantisse dans la colonne préfixe */
  mantissa: number;
  /** Réponses attendues (display) */
  answerPrefix: string;
  answerSI: string;
  answerSci: string;
  /** Pour 'toPrefix' : plusieurs préfixes acceptables */
  acceptedPrefixes?: { sym: string; exp: number; mantissa: number }[];
}

// ── Préfixes ────────────────────────────────────────────────
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

// Préfixes courants (évite da/h qui sont rares en pratique sauf sections dédiées)
const COMMON_PREFIXES = PREFIXES.filter(p =>
  ['n','μ','m','c','k','M','G'].includes(p.sym)
);
const ALL_PREFIXES_WITH_BASE = [
  ...PREFIXES,
  { name: 'Base', sym: '', exp: 0 },
];

// ── Unités simples ───────────────────────────────────────────
// siBase = unité SI réelle (m, kg, s…)
// displayBase = unité dans laquelle on affiche les préfixes (m, g, s…)
// Note : mass SI = kg, mais on préfixe 'g' (kilo-gramme = base)
export interface UnitDef {
  displayBase: string; // ex: 'g' pour la masse
  siBase: string;      // ex: 'kg'
  siOffset: number;    // facteur displayBase → siBase (ex: 1e-3 pour g→kg)
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
  { displayBase: 'Ω',  siBase: 'Ω',  siOffset: 1,    label: 'résistance' },
  { displayBase: 'Pa', siBase: 'Pa', siOffset: 1,    label: 'pression' },
  { displayBase: 'T',  siBase: 'T',  siOffset: 1,    label: 'champ B' },
  { displayBase: 'Hz', siBase: 'Hz', siOffset: 1,    label: 'fréquence' },
];

// ── Unités composées ─────────────────────────────────────────
// Pour les composées, on préfixe le PREMIER sous-élément.
// Ex: km/s → k sur 'm', le '/s' reste. SI = m/s.
export interface ComposedUnitDef {
  /** Unité SI complète (ex: 'm/s') */
  siUnit: string;
  /** Partie qui reçoit le préfixe (ex: 'm') */
  prefixTarget: string;
  /** Suffixe fixe (ex: '/s') */
  suffix: string;
  /** facteur displayBase→siBase pour la partie préfixée */
  targetSiOffset: number;
  label: string;
}

export const COMPOSED_UNITS: ComposedUnitDef[] = [
  { siUnit: 'm/s',   prefixTarget: 'm',  suffix: '/s',   targetSiOffset: 1,    label: 'vitesse' },
  { siUnit: 'm/s²',  prefixTarget: 'm',  suffix: '/s²',  targetSiOffset: 1,    label: 'accélération' },
  { siUnit: 'N·m',   prefixTarget: 'N',  suffix: '·m',   targetSiOffset: 1,    label: 'moment de force' },
  { siUnit: 'N/kg',  prefixTarget: 'N',  suffix: '/kg',  targetSiOffset: 1,    label: 'champ de pesanteur' },
  { siUnit: 'N/m²',  prefixTarget: 'N',  suffix: '/m²',  targetSiOffset: 1,    label: 'pression (N/m²)' },
  { siUnit: 'J/kg',  prefixTarget: 'J',  suffix: '/kg',  targetSiOffset: 1,    label: 'énergie massique' },
  { siUnit: 'V/m',   prefixTarget: 'V',  suffix: '/m',   targetSiOffset: 1,    label: 'champ électrique' },
  { siUnit: 'N·km',  prefixTarget: 'N',  suffix: '·km',  targetSiOffset: 1e3,  label: 'travail (kN·km…)' },
];

// ── Helpers ───────────────────────────────────────────────────
function rand(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Mantisse à 1–4 chiffres significatifs, ≥ 1 */
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

/** Parse une saisie élève → nombre ou null */
export function parseInput(s: string): number | null {
  if (!s?.trim()) return null;
  let t = s.trim()
    .replace(',', '.')
    .replace(/\s/g, '')
    .replace(/[×xX*]/g, 'e')
    .replace(/\^/g, '');
  // Superscript digits → ASCII
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

// ── Conversion "unité usuelle la plus proche" ─────────────────
// Choisit le préfixe qui donne une mantisse entre 1 et 999 (ou 0,1 à 9,99).
// Retourne tous les préfixes acceptables (mantisse entre 0,1 et 999).
export function naturalPrefixes(
  siValue: number,
  siOffset: number // facteur SI→displayBase (inverse de siOffset de UnitDef)
): { sym: string; exp: number; mantissa: number }[] {
  const results: { sym: string; exp: number; mantissa: number }[] = [];
  for (const p of ALL_PREFIXES_WITH_BASE) {
    // valeur dans displayBase = siValue / siOffset
    // valeur avec préfixe = (siValue / siOffset) / 10^p.exp
    const displayVal = siValue / siOffset; // en displayBase (ex: en g si masse)
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

// ── Génération d'une ligne ────────────────────────────────────
function makeSimpleRow(
  sectionId: SectionId,
  unit: UnitDef,
  prefixPool: typeof COMMON_PREFIXES
): ExRow {
  const pre = pick(prefixPool);
  const mantissa = randMantissa();

  // Valeur en displayBase (ex: en 'g')
  const displayBaseVal = mantissa * Math.pow(10, pre.exp);
  // Valeur SI réelle (ex: en 'kg')
  const siValue = displayBaseVal * unit.siOffset;

  const prefixedDisplay = `${toDecimalDisplay(mantissa)} ${pre.sym}${unit.displayBase}`;
  const siDisplay = `${toDecimalDisplay(siValue)} ${unit.siBase}`;
  const sciDisplay = toSciDisplay(siValue, unit.siBase);

  const acceptedPrefixes = naturalPrefixes(siValue, unit.siOffset);

  let given: ExRow['given'];
  switch (sectionId) {
    case 'toSI':     given = 'prefix'; break;
    case 'toPrefix': given = 'si';     break;
    case 'toSci':    given = 'si';     break;
    case 'fromSci':  given = 'sci';    break;
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

function makeComposedRow(unit: ComposedUnitDef): ExRow {
  const pre = pick(COMMON_PREFIXES);
  const mantissa = randMantissa();

  // Valeur dans l'unité préfixée-cible
  const targetBaseVal = mantissa * Math.pow(10, pre.exp);
  // Valeur SI de la sous-unité préfixée
  const targetSiVal = targetBaseVal * unit.targetSiOffset;
  // La valeur SI complète (ex: pour km/s, siValue est en m/s)
  // On stocke le NOMBRE tel que N prefixUnit+suffix = siValue siUnit
  // ex: 3 km/s → siValue = 3000 (en m/s)
  const siValue = targetSiVal; // simplification: suffix n'a pas de préfixe

  const prefixedUnit = `${pre.sym}${unit.prefixTarget}${unit.suffix}`;
  const prefixedDisplay = `${toDecimalDisplay(mantissa)} ${prefixedUnit}`;
  const siDisplay = `${toDecimalDisplay(siValue)} ${unit.siUnit}`;
  const sciDisplay = toSciDisplay(siValue, unit.siUnit);

  const given = pick(['prefix', 'si', 'sci'] as const);

  return {
    given,
    givenDisplay: given === 'prefix' ? prefixedDisplay : given === 'si' ? siDisplay : sciDisplay,
    siValue,
    siUnit: unit.siUnit,
    prefixSym: pre.sym,
    prefixExp: pre.exp,
    mantissa,
    answerPrefix: prefixedDisplay,
    answerSI: siDisplay,
    answerSci: sciDisplay,
    acceptedPrefixes: [{ sym: pre.sym, exp: pre.exp, mantissa }],
  };
}

// ── Export principal ──────────────────────────────────────────
export function generateRows(sectionId: SectionId, count: number): ExRow[] {
  const rows: ExRow[] = [];
  const pool = sectionId === 'toSI' || sectionId === 'mixed'
    ? [...COMMON_PREFIXES, ...PREFIXES.filter(p => p.sym === 'da' || p.sym === 'h')]
    : COMMON_PREFIXES;

  for (let i = 0; i < count; i++) {
    if (sectionId === 'composed') {
      rows.push(makeComposedRow(pick(COMPOSED_UNITS)));
    } else if (sectionId === 'mixed') {
      // 70% simples, 30% composées
      if (Math.random() < 0.3) {
        rows.push(makeComposedRow(pick(COMPOSED_UNITS)));
      } else {
        rows.push(makeSimpleRow(sectionId, pick(SIMPLE_UNITS), pool as typeof COMMON_PREFIXES));
      }
    } else {
      rows.push(makeSimpleRow(sectionId, pick(SIMPLE_UNITS), pool as typeof COMMON_PREFIXES));
    }
  }
  return rows;
}

// ── Vérification d'une réponse élève ─────────────────────────
export interface CheckResult {
  prefixOk: boolean | null; // null si non demandé (colonne donnée)
  siOk: boolean | null;
  sciOk: boolean | null;
}

export function checkRow(row: ExRow, inputs: { prefix: string; si: string; sci: string }): CheckResult {
  const result: CheckResult = { prefixOk: null, siOk: null, sciOk: null };

  if (row.given !== 'si') {
    const v = parseInput(inputs.si);
    result.siOk = v !== null && approxEq(v, row.siValue);
  }
  if (row.given !== 'sci') {
    const v = parseInput(inputs.sci);
    result.sciOk = v !== null && approxEq(v, row.siValue);
  }
  if (row.given !== 'prefix') {
    const v = parseInput(inputs.prefix);
    if (v === null) {
      result.prefixOk = false;
    } else {
      // Accepter tous les préfixes donnant une mantisse cohérente
      result.prefixOk = (row.acceptedPrefixes ?? [{ sym: row.prefixSym, exp: row.prefixExp, mantissa: row.mantissa }])
        .some(ap => approxEq(v, ap.mantissa));
    }
  }
  return result;
}