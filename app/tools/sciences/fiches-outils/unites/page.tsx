// ============================================================
// app/tools/sciences/fiches-outils/unites/page.tsx
// Fiche-outil : "Contrat — Unités"
// ============================================================
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DrillTable, { DrillRowData, DrillColumn } from '@/components/sciences/fiches-outils/DrillTable';
import { useProgressionFiche } from '@/hooks/sciences/useProgressionFiche';
import {
  generateRows,
  SectionId,
  ExRow,
  PREFIXES,
  toSciDisplay,
  toDecimalDisplay,
  parseInput,
  approxEq,
} from '@/lib/sciences/fiches-outils/unites';

// ── Sections ───────────────────────────────────────────────────
const SECTIONS: { id: SectionId; label: string; description: string }[] = [
  { id: 'toSI',     label: 'Préfixe → SI',     description: 'Convertir une unité préfixée vers son équivalent SI' },
  { id: 'toPrefix', label: 'SI → préfixe',      description: 'Exprimer une valeur SI dans l\'unité usuelle la plus proche' },
  { id: 'toSci',    label: 'SI → scientifique', description: 'Passer de la valeur décimale à la notation scientifique' },
  { id: 'fromSci',  label: 'Sci → SI + préfixe',description: 'Lire une notation scientifique, trouver SI et préfixe' },
  { id: 'mixed',    label: 'Mixte',             description: 'Exercices variés : toutes conversions, unités simples' },
  { id: 'composed', label: 'Unités composées',  description: 'Conversions avec m/s, N·m, V/m, N·km…' },
];

const COLUMNS: DrillColumn[] = [
  { key: 'prefix', label: 'Unité avec préfixe' },
  { key: 'si',     label: 'Unité SI' },
  { key: 'sci',    label: 'Notation scientifique' },
];

const ROW_COUNT = 12;

// ── Conversion ExRow → DrillRowData ───────────────────────────
function toDrillRow(row: ExRow): DrillRowData {
  const colKey = row.given;

  // Validator pour la colonne 'prefix' : accepte tous les préfixes naturels
  const prefixValidator = (input: string) => {
    const v = parseInput(input);
    if (v === null) return false;
    return (row.acceptedPrefixes ?? [{ sym: row.prefixSym, exp: row.prefixExp, mantissa: row.mantissa }])
      .some(ap => approxEq(v, ap.mantissa));
  };

  return {
    given: colKey,
    givenDisplay: row.givenDisplay,
    answers: {
      prefix: row.answerPrefix,
      si:     row.answerSI,
      sci:    row.answerSci,
    },
    validators: {
      prefix: prefixValidator,
      si:  (s) => { const v = parseInput(s); return v !== null && approxEq(v, row.siValue); },
      sci: (s) => { const v = parseInput(s); return v !== null && approxEq(v, row.siValue); },
    },
  };
}

// ── Page ───────────────────────────────────────────────────────
export default function FicheUnitesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'theory' | 'exercises'>('theory');
  const [activeSection, setActiveSection] = useState<SectionId>('toSI');
  const [rows, setRows] = useState<ExRow[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [bestScores, setBestScores] = useState<Partial<Record<SectionId, number>>>({});

  // Auth
  useEffect(() => {
    const type = localStorage.getItem('userType');
    const id   = localStorage.getItem('userId');
    if (!type || !id) { router.push('/'); return; }
    if (type === 'student') setUserId(parseInt(id));
  }, [router]);

  // Progression Supabase (uniquement pour les élèves)
  const { progression, markOpened, markSucceeded } = useProgressionFiche(userId, 'unites');

  // Marquer opened dès que la page est chargée par un élève
  useEffect(() => {
    if (userId && progression && !progression.opened_at) markOpened();
  }, [userId, progression]); // eslint-disable-line react-hooks/exhaustive-deps

  // Génération
  function generate(sectionId: SectionId = activeSection) {
    setRows(generateRows(sectionId, ROW_COUNT));
  }

  useEffect(() => { if (activeTab === 'exercises') generate(); }, [activeSection, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const drillRows: DrillRowData[] = useMemo(() => rows.map(toDrillRow), [rows]);

  function handleScoreChange(pct: number) {
    setBestScores(prev => {
      const current = prev[activeSection] ?? 0;
      const next = { ...prev, [activeSection]: Math.max(current, pct) };
      // Si toutes les sections ≥ 80% et élève → marquer succeeded
      const allGood = SECTIONS.every(s => (next[s.id] ?? 0) >= 80);
      if (allGood && userId) markSucceeded();
      return next;
    });
  }

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>

      {/* En-tête */}
      <div style={styles.header}>
        <div>
          <p style={styles.breadcrumb}>Sciences · Fiches-outils</p>
          <h1 style={styles.title}>Contrat — Unités</h1>
          <p style={styles.subtitle}>Préfixes SI, conversions et notation scientifique</p>
        </div>
        {progression?.succeeded_at && (
          <div style={styles.badge}>Réussi</div>
        )}
      </div>

      {/* Onglets principaux */}
      <div style={styles.tabs}>
        {(['theory', 'exercises'] as const).map(t => (
          <button key={t} style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(t)}>
            {t === 'theory' ? 'Rappel théorique' : 'Exercices'}
          </button>
        ))}
      </div>

      {/* ── RAPPEL THÉORIQUE ── */}
      {activeTab === 'theory' && (
        <div style={styles.card}>
          <Section title="Préfixes SI">
            <table style={styles.prefixTable}>
              <thead>
                <tr>
                  {['Préfixe','Symbole','Facteur','Puissance'].map(h =>
                    <th key={h} style={styles.pth}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {PREFIXES.map(p => (
                  <tr key={p.sym}>
                    <td style={styles.ptd}>{p.name}</td>
                    <td style={{ ...styles.ptd, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{p.sym}</td>
                    <td style={{ ...styles.ptd, fontFamily: 'var(--font-mono)' }}>
                      {p.exp < 0
                        ? `1 / ${Number('1e'+Math.abs(p.exp)).toLocaleString('fr')}`
                        : Number('1e'+p.exp).toLocaleString('fr')}
                    </td>
                    <td style={{ ...styles.ptd, fontFamily: 'var(--font-mono)' }}>10{supStr(p.exp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Notes importantes">
            <TheoryBox>La casse a son importance : <Mono>m</Mono> = milli (10⁻³) ≠ <Mono>M</Mono> = Méga (10⁶).</TheoryBox>
            <TheoryBox>La masse en SI s'exprime en <Mono>kg</Mono> (kilogramme), pas en gramme.</TheoryBox>
            <TheoryBox>
              Les unités se multiplient comme des variables.<br/>
              Ex : <Mono>cN · dm = 10⁻² N · 10⁻¹ m = 10⁻³ N·m</Mono>
            </TheoryBox>
            <TheoryBox>
              <strong>Notation scientifique</strong> : un seul chiffre avant la virgule.<br/>
              Ex : <Mono>3475 = 3,475 × 10³</Mono>
            </TheoryBox>
          </Section>

          <div style={{ marginTop: '1.25rem' }}>
            <button style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => setActiveTab('exercises')}>
              Passer aux exercices →
            </button>
          </div>
        </div>
      )}

      {/* ── EXERCICES ── */}
      {activeTab === 'exercises' && (
        <>
          {/* Sélecteur de section */}
          <div style={styles.sectionGrid}>
            {SECTIONS.map(s => {
              const score = bestScores[s.id];
              return (
                <button key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    ...styles.sectionBtn,
                    ...(activeSection === s.id ? styles.sectionBtnActive : {}),
                  }}>
                  <span style={styles.sectionLabel}>{s.label}</span>
                  {score !== undefined && (
                    <span style={{
                      ...styles.sectionScore,
                      color: score >= 80 ? '#3B6D11' : score >= 50 ? '#BA7517' : '#A32D2D',
                    }}>
                      {score}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={styles.card}>
            <div style={styles.drillHeader}>
              <div>
                <h2 style={styles.drillTitle}>
                  {SECTIONS.find(s => s.id === activeSection)?.label}
                </h2>
                <p style={styles.drillDesc}>
                  {SECTIONS.find(s => s.id === activeSection)?.description}
                </p>
              </div>
              <button style={styles.btn} onClick={() => generate()}>
                Nouveaux exercices
              </button>
            </div>

            <p style={styles.hint}>
              Saisir les nombres seuls (ex : <Mono>3,475</Mono> pour la colonne SI, ou <Mono>3,475</Mono> pour la notation scientifique — le ×10ⁿ est inféré). Plusieurs préfixes peuvent être acceptés pour la colonne préfixe.
            </p>

            {drillRows.length > 0 && (
              <DrillTable
                columns={COLUMNS}
                rows={drillRows}
                onScoreChange={handleScoreChange}
                onAllCorrect={() => { if (userId) markSucceeded(); }}
              />
            )}
          </div>
        </>
      )}
    </main>
  );
}

// ── Sous-composants locaux ─────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)',
        marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function TheoryBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      borderLeft: '3px solid #639922',
      borderRadius: '0 8px 8px 0',
      padding: '.65rem 1rem',
      marginBottom: '.6rem',
      fontSize: '14px',
      lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{children}</span>;
}

function supStr(e: number): string {
  const map: Record<string, string> = {
    '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
    '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻',
  };
  if (e === 0) return '⁰';
  return String(e).split('').map(c => map[c] ?? c).join('');
}

// ── Styles ─────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  breadcrumb: { fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' },
  title: { fontSize: '22px', fontWeight: 500, marginBottom: '4px' },
  subtitle: { fontSize: '14px', color: 'var(--color-text-secondary)' },
  badge: {
    background: '#EAF3DE', color: '#3B6D11',
    border: '0.5px solid #C0DD97',
    borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: 500,
  },
  tabs: { display: 'flex', gap: '4px', marginBottom: '1.25rem' },
  tab: {
    fontSize: '13px', padding: '5px 14px', borderRadius: '20px', cursor: 'pointer',
    border: '0.5px solid var(--color-border-tertiary)',
    color: 'var(--color-text-secondary)',
    background: 'var(--color-background-primary)',
  },
  tabActive: { background: '#EAF3DE', color: '#3B6D11', borderColor: '#C0DD97' },
  card: {
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: '12px', padding: '1.25rem',
    background: 'var(--color-background-primary)',
    marginBottom: '1rem',
  },
  prefixTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '.5rem' },
  pth: {
    background: 'var(--color-background-secondary)',
    color: 'var(--color-text-secondary)',
    fontWeight: 500, padding: '6px 10px',
    border: '0.5px solid var(--color-border-tertiary)',
    textAlign: 'left' as const, fontSize: '12px',
  },
  ptd: { padding: '5px 10px', border: '0.5px solid var(--color-border-tertiary)' },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '6px',
    marginBottom: '1rem',
  },
  sectionBtn: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start',
    padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
    border: '0.5px solid var(--color-border-tertiary)',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
    textAlign: 'left' as const,
  },
  sectionBtnActive: { background: '#EAF3DE', borderColor: '#C0DD97' },
  sectionLabel: { fontSize: '12px', fontWeight: 500, lineHeight: 1.3 },
  sectionScore: { fontSize: '11px', marginTop: '2px', fontWeight: 500 },
  drillHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '1rem', gap: '1rem',
  },
  drillTitle: { fontSize: '15px', fontWeight: 500, marginBottom: '2px' },
  drillDesc: { fontSize: '13px', color: 'var(--color-text-secondary)' },
  hint: {
    fontSize: '12px', color: 'var(--color-text-secondary)',
    background: 'var(--color-background-secondary)',
    borderRadius: '6px', padding: '6px 10px', marginBottom: '1rem',
    lineHeight: 1.5,
  },
  btn: {
    fontSize: '12px', padding: '5px 14px', borderRadius: '8px', cursor: 'pointer',
    border: '0.5px solid var(--color-border-secondary)',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
    whiteSpace: 'nowrap' as const,
  },
  btnPrimary: { background: '#EAF3DE', color: '#3B6D11', borderColor: '#C0DD97' },
};