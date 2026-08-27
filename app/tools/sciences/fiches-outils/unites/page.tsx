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
  const [animCompleted, setAnimCompleted] = useState(false);

  // Réinitialiser l'état quand on change de slide
  useEffect(() => {
    if (slideId !== 'conversion_anim') {
      setAnimCompleted(false);
    }
  }, [slideId]);

  const isConversionSlide = slideId === 'conversion_anim';
  const canProceed = !isConversionSlide || animCompleted;

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
      {slideId === 'conversion_anim' && (
        <SlideConversionAnim onComplete={setAnimCompleted} />
      )}
      {slideId === 'notes' && <SlideNotes />}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button style={st.btn} onClick={onPrev} disabled={slideIdx === 0}>
          ← Précédent
        </button>
        <button 
          style={{ 
            ...st.btn, 
            ...st.btnPrimary,
            opacity: canProceed ? 1 : 0.5,
            cursor: canProceed ? 'pointer' : 'not-allowed',
          }} 
          onClick={canProceed ? onNext : undefined}
          disabled={!canProceed}
          title={!canProceed ? 'Terminez l\'animation pour continuer' : ''}
        >
          {slideIdx < totalSlides - 1 ? 'Suivant →' : 'Commencer les exercices →'}
        </button>
      </div>
      
      {!canProceed && (
        <p style={{ 
          fontSize: '12px', 
          color: 'var(--color-text-secondary)', 
          textAlign: 'center',
          marginTop: '8px',
          fontStyle: 'italic',
        }}>
          Terminez les deux animations de conversion pour pouvoir continuer
        </p>
      )}
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
      <TB>⚠️ La casse (les majuscules) compte ! Par exemple, <M>m</M> = milli (10⁻³) ≠ <M>M</M> = Méga (10⁶).</TB>
    </>
  );
}

// Animation de conversion
function SlideConversionAnim({ onComplete }: { onComplete: (completed: boolean) => void }) {
  const [phase, setPhase] = useState<'kilo' | 'milli'>('kilo');
  const [kiloStep, setKiloStep] = useState(0);
  const [milliStep, setMilliStep] = useState(0);
  const [kiloCompleted, setKiloCompleted] = useState(false);
  const [milliCompleted, setMilliCompleted] = useState(false);
  
  const kiloSteps = [
    { label: 'Valeur de départ', top: '12 km', bottom: null, highlight: 'prefix' },
    { label: 'Identifier le préfixe', top: '12 k x m', bottom: 'k = 1000', highlight: 'k' },
    { label: 'Remplacer le préfixe', top: '12 x 1000 m', bottom: null, highlight: 'exp' },
    { label: 'Calculer', top: '12 000 m', bottom: '= 12 x 1000', highlight: 'result' },
  ];

  const milliSteps = [
    { label: 'Valeur de départ', top: '5 mm', bottom: null, highlight: 'prefix' },
    { label: 'Identifier le préfixe', top: '5 m x m', bottom: null, highlight: 'm' },
    { label: 'Remplacer le préfixe', top: '5 x', bottom: null, highlight: 'exp' },
    { label: 'Calculer', top: '0,005 m', bottom: '= 5 ÷ 1000', highlight: 'result' },
  ];

  const currentSteps = phase === 'kilo' ? kiloSteps : milliSteps;
  const currentStep = phase === 'kilo' ? kiloStep : milliStep;
  const currentCompleted = phase === 'kilo' ? kiloCompleted : milliCompleted;
  const cur = currentSteps[currentStep];

  const handleNext = () => {
    if (phase === 'kilo') {
      if (kiloStep < kiloSteps.length - 1) {
        setKiloStep(kiloStep + 1);
        if (kiloStep + 1 === kiloSteps.length - 1) {
          setKiloCompleted(true);
        }
      } else {
        // Passer à la phase milli
        setPhase('milli');
        setMilliStep(0);
      }
    } else {
      if (milliStep < milliSteps.length - 1) {
        setMilliStep(milliStep + 1);
        if (milliStep + 1 === milliSteps.length - 1) {
          setMilliCompleted(true);
          onComplete(true);
        }
      }
    }
  };

  const handlePrev = () => {
    if (phase === 'kilo') {
      if (kiloStep > 0) {
        setKiloStep(kiloStep - 1);
        if (kiloCompleted) {
          setKiloCompleted(false);
          onComplete(false);
        }
      }
    } else {
      if (milliStep > 0) {
        setMilliStep(milliStep - 1);
        if (milliCompleted) {
          setMilliCompleted(false);
          onComplete(false);
        }
      } else {
        // Revenir à la phase kilo
        setPhase('kilo');
        setKiloStep(kiloSteps.length - 1);
      }
    }
  };

  const handleStepClick = (index: number) => {
    if (phase === 'kilo') {
      setKiloStep(index);
      if (index === kiloSteps.length - 1) {
        setKiloCompleted(true);
      } else if (kiloCompleted) {
        setKiloCompleted(false);
        onComplete(false);
      }
    } else {
      setMilliStep(index);
      if (index === milliSteps.length - 1) {
        setMilliCompleted(true);
        onComplete(true);
      } else if (milliCompleted) {
        setMilliCompleted(false);
        onComplete(false);
      }
    }
  };

  // Helper pour afficher une fraction propre
  const Fraction = ({ numerator, denominator }: { numerator: string; denominator: string }) => (
    <span style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      verticalAlign: 'middle',
      margin: '0 4px',
    }}>
      <span style={{
        display: 'block',
        padding: '0 8px',
        fontSize: '28px',
      }}>
        {numerator}
      </span>
      <span style={{
        display: 'block',
        width: '100%',
        height: '2px',
        background: 'currentColor',
        margin: '2px 0',
      }} />
      <span style={{
        display: 'block',
        padding: '0 8px',
        fontSize: '28px',
      }}>
        {denominator}
      </span>
    </span>
  );

  return (
    <>
      <TB>Pour convertir une unité préfixée vers l'unité SI, on remplace le préfixe par sa valeur numérique et on calcule.</TB>
      
      {/* Indicateur de phase */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '1rem',
      }}>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 500,
          background: phase === 'kilo' ? '#EAF3DE' : 'var(--color-background-secondary)',
          color: phase === 'kilo' ? '#3B6D11' : 'var(--color-text-secondary)',
        }}>
          Kilo (x 1000)
        </span>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 500,
          background: phase === 'milli' ? '#EAF3DE' : 'var(--color-background-secondary)',
          color: phase === 'milli' ? '#3B6D11' : 'var(--color-text-secondary)',
          opacity: kiloCompleted ? 1 : 0.5,
        }}>
          Milli (÷ 1000)
        </span>
      </div>
      
      <div style={{ 
        border: '2px solid #639922', 
        borderRadius: '12px',
        padding: '1.5rem', 
        textAlign: 'center', 
        margin: '1rem 0',
        background: 'var(--color-background-primary)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '1rem', fontWeight: 500 }}>
          {phase === 'kilo' ? 'Conversion kilo → mètre' : 'Conversion milli → mètre'} — 
          Étape {currentStep + 1} sur {currentSteps.length}
        </p>
        
        <div style={{ 
          fontSize: '32px', 
          fontFamily: 'var(--font-mono)', 
          fontWeight: 600,
          color: cur.highlight === 'result' ? '#3B6D11' : 'var(--color-text-primary)',
          transition: 'all 0.3s',
          marginBottom: '8px',
          minHeight: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}>
          {cur.top}
          {cur.label === 'Remplacer le préfixe' && phase === 'milli' && (
            <Fraction numerator="1" denominator="1000" />
          )}
          {cur.label === 'Remplacer le préfixe' && phase === 'milli' && 'm'}
        </div>
        
        {cur.bottom && phase === 'milli' && cur.label === 'Identifier le préfixe' && (
          <div style={{ 
            fontSize: '16px', 
            fontFamily: 'var(--font-mono)',
            color: '#854F0B', 
            marginTop: '8px',
            background: '#FFF8ED',
            padding: '8px 12px',
            borderRadius: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            m = <Fraction numerator="1" denominator="1000" />
          </div>
        )}
        
        {cur.bottom && (phase === 'kilo' || cur.label === 'Calculer') && (
          <div style={{ 
            fontSize: '16px', 
            fontFamily: 'var(--font-mono)',
            color: '#854F0B', 
            marginTop: '8px',
            background: '#FFF8ED',
            padding: '8px 12px',
            borderRadius: '4px',
            display: 'inline-block',
          }}>
            {cur.bottom}
          </div>
        )}
        
        {/* Barre de progression de l'animation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '12px', 
          marginTop: '1.5rem',
          marginBottom: '1rem',
        }}>
          {currentSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => handleStepClick(i)}
              style={{
                width: i === currentStep ? '32px' : '12px',
                height: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: i === currentStep ? '#639922' : i < currentStep ? '#97C459' : 'var(--color-border-secondary)',
                transition: 'all 0.3s',
                border: 'none',
                padding: 0,
              }}
              aria-label={`Étape ${i + 1}`}
            />
          ))}
        </div>
        
        {/* Boutons de navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '12px', 
          marginTop: '10px',
        }}>
          <button 
            style={{ 
              ...st.btn, 
              fontSize: '14px', 
              padding: '8px 16px',
              background: (phase === 'kilo' && kiloStep === 0) ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
              minWidth: '100px',
            }}
            onClick={handlePrev} 
            disabled={phase === 'kilo' && kiloStep === 0}
          >
            ← Précédent
          </button>
          <button 
            style={{ 
              ...st.btn, 
              ...st.btnPrimary, 
              fontSize: '14px', 
              padding: '8px 16px',
              minWidth: '100px',
              opacity: currentCompleted && currentStep === currentSteps.length - 1 ? 0.7 : 1,
            }}
            onClick={handleNext} 
            disabled={currentCompleted && currentStep === currentSteps.length - 1 && phase === 'milli'}
          >
            {phase === 'kilo' && kiloStep === kiloSteps.length - 1 
              ? 'Voir avec milli →' 
              : phase === 'milli' && milliStep === milliSteps.length - 1 
                ? '✓ Terminé' 
                : 'Suivant →'}
          </button>
        </div>
        
        {currentCompleted && currentStep === currentSteps.length - 1 && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: '#EAF3DE',
            color: '#3B6D11',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            {phase === 'kilo' 
              ? '✓ Conversion kilo terminée ! Cliquez sur "Voir avec milli" pour continuer.' 
              : '✓ Animation terminée ! Vous pouvez continuer.'}
          </div>
        )}
      </div>
      
      <TB>Dans l'autre sens : <M>12 000 m → 12 km</M> ou <M>0,005 m → 5 mm</M>. On cherche le préfixe qui donne un nombre "lisible" (entre 0,1 et 999).</TB>
    </>
  );
}

function SlideNotes() {
  return (
    <>
      <TB>⚠️ <strong>La casse compte</strong> : <M>m</M> = milli (10⁻³) mais <M>M</M> = Méga (10⁶). Une erreur de majuscule change le résultat d'un facteur 10⁹.</TB>
      <TB>⚠️ <strong>La masse</strong> en SI s'exprime en <M>kg</M>. Quand on préfixe le gramme, on écrit <M>mg</M>, <M>μg</M>… mais l'unité SI reste <M>kg</M>.</TB>
      <TB><strong>Unités composées</strong> : les unités se multiplient et divisent comme des variables. <M>cN · dm = 10⁻² N · 10⁻¹ m = 10⁻³ N·m</M></TB>
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