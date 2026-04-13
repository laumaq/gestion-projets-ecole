// ============================================================
// app/tools/sciences/fiches-outils/unites/page.tsx
// ============================================================
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DrillTable, { DrillResult } from '@/components/sciences/fiches-outils/DrillTable';
import { useProgressionFiche } from '@/hooks/sciences/useProgressionFiche';
import {
  generateRows, getSections, SectionId, SectionDef, ExRow, FicheMode,
  PREFIXES, toDecimalDisplay, toSciDisplay, parseInput, approxEq,
  ROW_COUNT, scoreLevel, SCORE_LEVEL_LABELS, SCORE_LEVEL_COLORS,
} from '@/lib/sciences/fiches-outils/unites';
import type { DrillRowData, DrillColumn } from '@/components/sciences/fiches-outils/DrillTable';

// ── Constantes ────────────────────────────────────────────────
const THEORY_SLIDES = [
  'intro',
  'si',
  'prefixes_why',
  'prefixes_table',
  'conversion_anim',
  'notes',
] as const;
type TheorySlide = typeof THEORY_SLIDES[number];

const SLIDE_TITLES: Record<TheorySlide, string> = {
  intro:           'Qu\'est-ce qu\'une unité ?',
  si:              'Le Système International',
  prefixes_why:    'À quoi servent les préfixes ?',
  prefixes_table:  'Les préfixes SI',
  conversion_anim: 'Convertir : comment ça marche ?',
  notes:           'Points d\'attention',
};

// Étapes du flux linéaire
type Step =
  | { kind: 'theory'; slideIdx: number }
  | { kind: 'exercise'; sectionIdx: number }
  | { kind: 'result' };

// ── toDrillRow ────────────────────────────────────────────────
function toDrillRow(row: ExRow, columns: DrillColumn[]): DrillRowData {
  const prefixValidator = (input: string) => {
    const v = parseInput(input);
    if (v === null) return false;
    return (row.acceptedPrefixes ?? [{ sym: row.prefixSym, exp: row.prefixExp, mantissa: row.mantissa }])
      .some(ap => approxEq(v, ap.mantissa));
  };
  return {
    given: row.given,
    givenDisplay: row.givenDisplay,
    answers: { prefix: row.answerPrefix, si: row.answerSI, sci: row.answerSci },
    validators: {
      prefix: prefixValidator,
      si:  s => { const v = parseInput(s); return v !== null && approxEq(v, row.siValue); },
      sci: s => { const v = parseInput(s); return v !== null && approxEq(v, row.siValue); },
    },
  };
}

// ── Page ──────────────────────────────────────────────────────
export default function FicheUnitesPage() {
  const router = useRouter();
  const [userId, setUserId]     = useState<number | null>(null);
  const [userType, setUserType] = useState<'employee' | 'student'>('student');
  const [mode, setMode]         = useState<FicheMode>('normal');
  const [modeReady, setModeReady] = useState(false);

  // Flux
  const [step, setStep]           = useState<Step>({ kind: 'theory', slideIdx: 0 });
  const [sectionRows, setSectionRows] = useState<ExRow[]>([]);
  const [sectionScores, setSectionScores] = useState<number[]>([]);

  // Auth + mode depuis BDD
  useEffect(() => {
    const type = localStorage.getItem('userType') as 'employee' | 'student';
    const id   = localStorage.getItem('userId');
    if (!type || !id) { router.push('/'); return; }
    setUserType(type);
    if (type === 'student') setUserId(parseInt(id));
    else setModeReady(true);
  }, [router]);

  const { progression, loading, markOpened, markScore } = useProgressionFiche(userId, 'unites');

  // Une fois la progression chargée, lire le mode
  useEffect(() => {
    if (loading) return;
    const m = progression?.mode ?? 'normal';
    setMode(m);
    setModeReady(true);
    if (userId && !progression?.opened_at) markOpened();
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = useMemo(() => getSections(mode), [mode]);

  // Génère les lignes pour la section courante
  useEffect(() => {
    if (step.kind !== 'exercise') return;
    const sec = sections[step.sectionIdx];
    if (!sec) return;
    setSectionRows(generateRows(sec.id));
  }, [step, sections]);

  const drillColumns: DrillColumn[] = useMemo(() => {
    if (step.kind !== 'exercise') return [];
    const sec = sections[step.sectionIdx];
    if (!sec) return [];
    const labels: Record<string, string> = {
      prefix: 'Unité avec préfixe',
      si:     'Unité SI',
      sci:    'Notation scientifique',
    };
    return sec.columns.map(k => ({ key: k, label: labels[k] }));
  }, [step, sections]);

  const drillRows: DrillRowData[] = useMemo(
    () => sectionRows.map(r => toDrillRow(r, drillColumns)),
    [sectionRows, drillColumns]
  );

  // Navigation flux
  function goNext() {
    if (step.kind === 'theory') {
      if (step.slideIdx < THEORY_SLIDES.length - 1) {
        setStep({ kind: 'theory', slideIdx: step.slideIdx + 1 });
      } else {
        setStep({ kind: 'exercise', sectionIdx: 0 });
        setSectionScores([]);
      }
    } else if (step.kind === 'exercise') {
      if (step.sectionIdx < sections.length - 1) {
        setStep({ kind: 'exercise', sectionIdx: step.sectionIdx + 1 });
      } else {
        setStep({ kind: 'result' });
      }
    }
  }

  function goPrev() {
    if (step.kind === 'theory' && step.slideIdx > 0) {
      setStep({ kind: 'theory', slideIdx: step.slideIdx - 1 });
    } else if (step.kind === 'exercise') {
      if (step.sectionIdx === 0) {
        setStep({ kind: 'theory', slideIdx: THEORY_SLIDES.length - 1 });
      } else {
        setStep({ kind: 'exercise', sectionIdx: step.sectionIdx - 1 });
      }
    }
  }

  function handleDrillNext(result: DrillResult) {
    const newScores = [...sectionScores, result.pct];
    setSectionScores(newScores);
    if (step.kind !== 'exercise') return;

    if (step.sectionIdx < sections.length - 1) {
      setStep({ kind: 'exercise', sectionIdx: step.sectionIdx + 1 });
    } else {
      // Calcul score global = moyenne des sections
      const globalPct = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length);
      if (userId) markScore(globalPct);
      setStep({ kind: 'result' });
    }
  }

  // ── Barre de progression ──────────────────────────────────
  const totalSteps = THEORY_SLIDES.length + sections.length + 1; // +1 result
  const currentStep = step.kind === 'theory'
    ? step.slideIdx
    : step.kind === 'exercise'
    ? THEORY_SLIDES.length + step.sectionIdx
    : totalSteps - 1;

  if (!modeReady) return <Loader />;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>

      {/* En-tête */}
      <div style={st.header}>
        <div>
          <Link href="/tools/sciences/fiches-outils"
            style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
            ← Sciences · Fiches-outils
          </Link>
          <h1 style={st.title}>Contrat — Unités</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 500,
            background: mode === 'advanced' ? '#EEEDFE' : '#EAF3DE',
            color: mode === 'advanced' ? '#534AB7' : '#3B6D11',
          }}>
            {mode === 'advanced' ? 'Avancé' : 'Normal'}
          </span>
          {progression?.succeeded_at && (
            <span style={st.succeededBadge}>Réussi</span>
          )}
        </div>
      </div>

      {/* Barre de progression */}
      <ProgressBar current={currentStep} total={totalSteps - 1} />

      {/* ── THÉORIE ── */}
      {step.kind === 'theory' && (
        <TheoryPanel
          slideId={THEORY_SLIDES[step.slideIdx]}
          slideIdx={step.slideIdx}
          totalSlides={THEORY_SLIDES.length}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}

      {/* ── EXERCICE ── */}
      {step.kind === 'exercise' && (() => {
        const sec = sections[step.sectionIdx];
        return (
          <div style={st.card}>
            {/* En-tête section */}
            <div style={st.secHeader}>
              <div>
                <span style={st.secBadge}>
                  Section {step.sectionIdx + 1}/{sections.length}
                </span>
                <h2 style={st.secTitle}>{sec.label}</h2>
                <p style={st.secDesc}>{sec.description}</p>
              </div>
            </div>

            {/* Exemple */}
            <div style={st.exampleBox}>
              <span style={st.exampleLabel}>Exemple</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{sec.example}</span>
            </div>

            {/* Hint saisie */}
            <p style={st.hint}>
              Saisir le nombre uniquement. Virgule ou point acceptés.
              Pour la notation scientifique : écrire ex. <code>4,2e-3</code> ou <code>4,2×10⁻³</code>.
              Plusieurs préfixes peuvent être acceptés pour la colonne préfixe.
            </p>

            {drillRows.length > 0 && (
              <DrillTable
                columns={drillColumns}
                rows={drillRows}
                onNext={handleDrillNext}
              />
            )}
          </div>
        );
      })()}

      {/* ── RÉSULTAT FINAL ── */}
      {step.kind === 'result' && (
        <ResultPanel
          scores={sectionScores}
          sections={sections}
          onRestart={() => {
            setStep({ kind: 'theory', slideIdx: 0 });
            setSectionScores([]);
          }}
        />
      )}
    </main>
  );
}

// ══════════════════════════════════════════════════════════════
// PANNEAUX THÉORIQUES
// ══════════════════════════════════════════════════════════════
function TheoryPanel({
  slideId, slideIdx, totalSlides, onNext, onPrev,
}: {
  slideId: TheorySlide;
  slideIdx: number;
  totalSlides: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div style={st.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500 }}>{SLIDE_TITLES[slideId]}</h2>
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          {slideIdx + 1} / {totalSlides}
        </span>
      </div>

      {slideId === 'intro' && <SlideIntro />}
      {slideId === 'si' && <SlideSI />}
      {slideId === 'prefixes_why' && <SlidePrefixesWhy />}
      {slideId === 'prefixes_table' && <SlidePrefixesTable />}
      {slideId === 'conversion_anim' && <SlideConversionAnim />}
      {slideId === 'notes' && <SlideNotes />}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button style={st.btn} onClick={onPrev} disabled={slideIdx === 0}>
          ← Précédent
        </button>
        <button style={{ ...st.btn, ...st.btnPrimary }} onClick={onNext}>
          {slideIdx < totalSlides - 1 ? 'Suivant →' : 'Commencer les exercices →'}
        </button>
      </div>
    </div>
  );
}

function TB({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      borderLeft: '3px solid #639922',
      borderRadius: '0 8px 8px 0',
      padding: '.65rem 1rem',
      marginBottom: '.6rem',
      fontSize: '14px',
      lineHeight: 1.6,
      ...style,  // ← fusionne le style passé en prop
    }}>
      {children}
    </div>
  );
}
function M({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--color-background-secondary)',
    padding: '1px 5px', borderRadius: '4px' }}>{children}</span>;
}

function SlideIntro() {
  return (
    <>
      <TB>En sciences, on cherche à <strong>quantifier</strong> ce qu'on observe — une distance, une vitesse, une température. Pour ça, on a besoin d'une référence commune : c'est ce qu'on appelle une <strong>unité</strong>.</TB>
      <TB>Une unité, c'est une valeur de référence qu'on multiplie par un nombre pour exprimer une mesure. Par exemple : <M>5 m</M> signifie "5 fois le mètre".</TB>
      <TB>Sans unités communes, la science serait impossible. En 1999, la sonde <em>Mars Climate Orbiter</em> s'est perdue parce qu'une équipe utilisait des pieds et l'autre des mètres. 328 millions de dollars partis en fumée.</TB>
    </>
  );
}

function SlideSI() {
  return (
    <>
      <TB>Le <strong>Système International d'unités (SI)</strong>, adopté en 1960, est le langage commun de la science mondiale. Il définit 7 unités de base à partir desquelles toutes les autres se déduisent.</TB>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', margin: '1rem 0', fontSize: '13px' }}>
        {[['Longueur','mètre','m'],['Masse','kilogramme','kg'],['Temps','seconde','s'],
          ['Intensité électrique','ampère','A'],['Température','kelvin','K'],
          ['Quantité de matière','mole','mol'],['Intensité lumineuse','candela','cd'],
        ].map(([g, n, s]) => (
          <div key={s} style={{ padding: '6px 10px', borderRadius: '6px',
            background: 'var(--color-background-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{g}</span>
            <span><M>{s}</M></span>
          </div>
        ))}
      </div>
      <TB>⚠️ Attention : la masse est en <M>kg</M> (kilogramme), pas en gramme. C'est la seule unité de base qui contient déjà un préfixe.</TB>
    </>
  );
}

function SlidePrefixesWhy() {
  return (
    <>
      <TB>Les grandeurs physiques varient sur des échelles <strong>énormes</strong>. La distance Terre-Soleil est de 149 600 000 000 m. Le rayon d'un atome d'hydrogène est de 0,0000000000529 m. Ces nombres sont impossibles à manipuler.</TB>
      <TB>Les <strong>préfixes</strong> sont des multiplicateurs standardisés qu'on place devant une unité. Ils permettent d'écrire ces valeurs de façon compacte et lisible :</TB>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '12px 16px',
        background: 'var(--color-background-secondary)', borderRadius: '8px', lineHeight: 2 }}>
        149 600 000 000 m = <strong>149,6 Gm</strong><br/>
        0,0000000000529 m = <strong>52,9 pm</strong>
      </div>
      <TB style={{ marginTop: '0.75rem' }}>Le préfixe ne change pas la grandeur, il change juste l'échelle de lecture. <M>1 km = 1000 m</M> — c'est exactement la même distance.</TB>
    </>
  );
}

function SlidePrefixesTable() {
  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '1rem' }}>
        <thead>
          <tr>
            {['Préfixe','Symbole','Facteur','Puissance de 10'].map(h =>
              <th key={h} style={{ background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)',
                fontWeight: 500, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)',
                textAlign: 'left', fontSize: '12px' }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {PREFIXES.map(p => (
            <tr key={p.sym} style={{ background: p.exp === 3 || p.exp === -3 ? 'var(--color-background-secondary)' : undefined }}>
              <td style={st.ptd}>{p.name}</td>
              <td style={{ ...st.ptd, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{p.sym}</td>
              <td style={{ ...st.ptd, fontFamily: 'var(--font-mono)' }}>
                {p.exp < 0
                  ? `1 / ${Number('1e' + Math.abs(p.exp)).toLocaleString('fr')}`
                  : Number('1e' + p.exp).toLocaleString('fr')}
              </td>
              <td style={{ ...st.ptd, fontFamily: 'var(--font-mono)' }}>10{expStr(p.exp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TB>⚠️ La casse compte ! <M>m</M> = milli (10⁻³) ≠ <M>M</M> = Méga (10⁶). <M>k</M> = kilo, <M>G</M> = Giga.</TB>
    </>
  );
}

// Animation de conversion
function SlideConversionAnim() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: 'Valeur de départ', top: '12 km', bottom: null, highlight: 'prefix' },
    { label: 'Identifier le préfixe', top: '12 k·m', bottom: 'k = 10³', highlight: 'k' },
    { label: 'Remplacer le préfixe', top: '12 × 10³ m', bottom: null, highlight: 'exp' },
    { label: 'Calculer', top: '12 000 m', bottom: '= 12 × 1000', highlight: 'result' },
  ];
  const cur = steps[step];

  return (
    <>
      <TB>Pour convertir une unité préfixée vers l'unité SI, on remplace le préfixe par sa valeur numérique et on calcule.</TB>
      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: '10px',
        padding: '1.5rem', textAlign: 'center', margin: '1rem 0' }}>
        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          {cur.label}
        </p>
        <div style={{ fontSize: '28px', fontFamily: 'var(--font-mono)', fontWeight: 500,
          color: cur.highlight === 'result' ? '#3B6D11' : 'var(--color-text-primary)',
          transition: 'all 0.3s', marginBottom: '8px' }}>
          {cur.top}
        </div>
        {cur.bottom && (
          <div style={{ fontSize: '14px', fontFamily: 'var(--font-mono)',
            color: '#854F0B', marginTop: '4px' }}>
            {cur.bottom}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '1.25rem' }}>
          {steps.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: '8px', height: '8px', borderRadius: '50%', cursor: 'pointer',
              background: i === step ? '#639922' : 'var(--color-border-secondary)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
          <button style={{ ...st.btn, fontSize: '12px', padding: '4px 12px' }}
            onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>←</button>
          <button style={{ ...st.btn, fontSize: '12px', padding: '4px 12px' }}
            onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}>→</button>
        </div>
      </div>
      <TB>Dans l'autre sens : <M>12 000 m → 12 km</M>. On cherche le préfixe qui donne un nombre "lisible" (entre 0,1 et 999). Ici, diviser par 10³ donne 12 — c'est le kilo.</TB>
    </>
  );
}

function SlideNotes() {
  return (
    <>
      <TB>⚠️ <strong>La casse compte</strong> : <M>m</M> = milli (10⁻³) mais <M>M</M> = Méga (10⁶). Une erreur de majuscule change le résultat d'un facteur 10⁹.</TB>
      <TB>⚠️ <strong>La masse</strong> en SI s'exprime en <M>kg</M>. Quand on préfixe le gramme, on écrit <M>mg</M>, <M>μg</M>… mais l'unité SI reste <M>kg</M>.</TB>
      <TB><strong>Unités composées</strong> : les unités se multiplient et divisent comme des variables. <M>cN · dm = 10⁻² N · 10⁻¹ m = 10⁻³ N·m</M></TB>
      <TB><strong>Notation scientifique</strong> : un seul chiffre non nul avant la virgule. <M>3475 = 3,475 × 10³</M>. La mantisse est toujours entre 1 et 9,999…</TB>
    </>
  );
}

// ── Score final ───────────────────────────────────────────────
function ResultPanel({
  scores, sections, onRestart,
}: {
  scores: number[];
  sections: SectionDef[];
  onRestart: () => void;
}) {
  const globalPct = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const level   = scoreLevel(globalPct);
  const levelC  = SCORE_LEVEL_COLORS[level];

  return (
    <div style={st.card}>
      <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '1.5rem' }}>Résultats</h2>

      {/* Score global */}
      <div style={{ textAlign: 'center', padding: '1.5rem',
        background: levelC.bg, borderRadius: '10px', border: `0.5px solid ${levelC.border}`,
        marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '48px', fontWeight: 500, color: levelC.text }}>{globalPct}%</div>
        <div style={{ fontSize: '14px', color: levelC.text, marginTop: '4px' }}>
          {SCORE_LEVEL_LABELS[level]}
        </div>
        {level === 'advise_redo' && (
          <p style={{ fontSize: '12px', color: levelC.text, marginTop: '8px', opacity: 0.8 }}>
            Bon résultat ! Un peu de pratique supplémentaire te permettrait de maîtriser ça complètement.
          </p>
        )}
        {(level === 'redo' || level === 'not_done') && (
          <p style={{ fontSize: '12px', color: levelC.text, marginTop: '8px', opacity: 0.8 }}>
            Continue à pratiquer — relis le rappel théorique et réessaie.
          </p>
        )}
        {level === 'succeeded' && (
          <p style={{ fontSize: '12px', color: levelC.text, marginTop: '8px', opacity: 0.8 }}>
            Excellent ! Tu maîtrises les conversions d'unités.
          </p>
        )}
      </div>

      {/* Détail par section */}
      <div style={{ marginBottom: '1.5rem' }}>
        {sections.map((sec, i) => {
          const pct = scores[i] ?? 0;
          const lvl = scoreLevel(pct);
          const c   = SCORE_LEVEL_COLORS[lvl];
          return (
            <div key={sec.id} style={{ display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <span style={{ flex: 1, fontSize: '13px' }}>{sec.label}</span>
              <div style={{ width: '120px', height: '5px', borderRadius: '3px',
                background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                <div style={{ height: '5px', width: `${pct}%`, borderRadius: '3px',
                  background: c.border, transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: c.text, minWidth: '36px', textAlign: 'right' }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button style={{ ...st.btn, ...st.btnPrimary }} onClick={onRestart}>
          Recommencer depuis le début
        </button>
        <Link href="/tools/sciences/fiches-outils" style={{ ...st.btn, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center' }}>
          Retour aux fiches
        </Link>
      </div>
    </div>
  );
}

// ── Barre de progression ──────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round(current / total * 100) : 0;
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ height: '4px', borderRadius: '2px',
        background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
        <div style={{ height: '4px', width: `${pct}%`, borderRadius: '2px',
          background: '#639922', transition: 'width 0.4s' }} />
      </div>
      <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
        Étape {current + 1} sur {total + 1}
      </p>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid var(--color-border-tertiary)',
        borderTop: '2px solid #639922', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        margin: '0 auto' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function expStr(e: number): string {
  const map: Record<string, string> = {
    '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
    '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻',
  };
  if (e === 0) return '';
  return String(e).split('').map(c => map[c] ?? c).join('');
}

// ── Styles ────────────────────────────────────────────────────
const st: Record<string, React.CSSProperties> = {
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  title:         { fontSize: '20px', fontWeight: 500, marginTop: '4px' },
  succeededBadge:{ background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #C0DD97',
                   borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 500 },
  card:          { border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px',
                   padding: '1.5rem', background: 'var(--color-background-primary)' },
  secHeader:     { marginBottom: '1rem' },
  secBadge:      { fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500,
                   textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: '4px' },
  secTitle:      { fontSize: '16px', fontWeight: 500, marginBottom: '2px' },
  secDesc:       { fontSize: '13px', color: 'var(--color-text-secondary)' },
  exampleBox:    { background: 'var(--color-background-secondary)', borderRadius: '6px',
                   padding: '8px 12px', marginBottom: '0.75rem', display: 'flex', gap: '10px',
                   alignItems: 'flex-start', flexWrap: 'wrap' },
  exampleLabel:  { fontSize: '11px', fontWeight: 500, color: '#3B6D11',
                   background: '#EAF3DE', borderRadius: '4px', padding: '1px 6px',
                   whiteSpace: 'nowrap', alignSelf: 'center' },
  hint:          { fontSize: '12px', color: 'var(--color-text-secondary)',
                   marginBottom: '1rem', lineHeight: 1.5 },
  btn:           { fontSize: '12px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                   border: '0.5px solid var(--color-border-secondary)',
                   background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' },
  btnPrimary:    { background: '#EAF3DE', color: '#3B6D11', borderColor: '#C0DD97' },
  ptd:           { padding: '5px 10px', border: '0.5px solid var(--color-border-tertiary)', fontSize: '13px' },
};