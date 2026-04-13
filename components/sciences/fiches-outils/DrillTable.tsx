// ============================================================
// components/sciences/fiches-outils/DrillTable.tsx
// ============================================================
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface DrillColumn {
  key: string;
  label: string;
}

export interface DrillRowData {
  given: string;
  givenDisplay: string;
  answers: Record<string, string>;
  validators?: Record<string, (input: string) => boolean>;
}

export interface DrillResult {
  correct: number;
  total: number;
  pct: number;
}

interface DrillTableProps {
  columns: DrillColumn[];
  rows: DrillRowData[];
  /** Appelé quand l'élève clique "Suivant" — reçoit le résultat */
  onNext: (result: DrillResult) => void;
}

type CellState = 'idle' | 'ok' | 'ko';

interface CellValue {
  input: string;
  state: CellState;
  correction: string;
}

// ── Helpers locaux ────────────────────────────────────────────
function parseNum(s: string): number | null {
  if (!s?.trim()) return null;
  let t = s.trim()
    .replace(',', '.').replace(/\s/g, '')
    .replace(/[×xX*]/g, 'e').replace(/\^/g, '');
  const sup: Record<string, string> = {
    '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4',
    '⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-',
  };
  t = t.split('').map(c => sup[c] ?? c).join('');
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
}

function approxEqStr(input: string, expected: string): boolean {
  const a = parseNum(input);
  const b = parseNum(expected);
  if (a === null || b === null) return false;
  if (a === 0 && b === 0) return true;
  if (a === 0 || b === 0) return Math.abs(a - b) < 1e-12;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) < 0.005;
}

type CellGrid = Record<string, CellValue>[];

function buildEmptyCells(rows: DrillRowData[], columns: DrillColumn[]): CellGrid {
  return rows.map(() =>
    Object.fromEntries(
      columns.map(c => [c.key, { input: '', state: 'idle' as CellState, correction: '' }])
    )
  );
}

// ── Composant ─────────────────────────────────────────────────
export default function DrillTable({ columns, rows, onNext }: DrillTableProps) {
  const [cells, setCells] = useState<CellGrid>(() => buildEmptyCells(rows, columns));
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  useEffect(() => {
    setCells(buildEmptyCells(rows, columns));
    setSubmitted(false);
    // Focus premier input
    setTimeout(() => {
      for (let ri = 0; ri < rows.length; ri++) {
        for (let ci = 0; ci < columns.length; ci++) {
          if (columns[ci].key !== rows[ri].given) {
            inputRefs.current[ri]?.[ci]?.focus();
            return;
          }
        }
      }
    }, 60);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Collecte les refs
  function setRef(ri: number, ci: number, el: HTMLInputElement | null) {
    if (!inputRefs.current[ri]) inputRefs.current[ri] = [];
    inputRefs.current[ri][ci] = el;
  }

  function updateCell(ri: number, colKey: string, input: string) {
    setCells(prev => {
      const next = prev.map(r => ({ ...r }));
      next[ri] = { ...next[ri], [colKey]: { ...next[ri][colKey], input, state: 'idle' } };
      return next;
    });
  }

  // Enter → passe au champ suivant dans l'ordre lecture (ligne par ligne)
  function handleEnter(ri: number, ci: number) {
    // Cherche le prochain input non-given à droite puis à la ligne suivante
    for (let r = ri; r < rows.length; r++) {
      const startC = r === ri ? ci + 1 : 0;
      for (let c = startC; c < columns.length; c++) {
        if (columns[c].key !== rows[r].given) {
          inputRefs.current[r]?.[c]?.focus();
          return;
        }
      }
    }
    // Plus de champ — on ne soumet pas, le bouton Suivant est là pour ça
  }

  // Soumettre et corriger — appelé par le bouton Suivant
  function handleSubmit() {
    if (submitted) {
      // Deuxième clic : on notifie le parent avec le score déjà calculé
      let correct = 0; let total = 0;
      cells.forEach((rowCells, ri) => {
        columns.forEach(col => {
          if (col.key === rows[ri].given) return;
          total++;
          if (rowCells[col.key].state === 'ok') correct++;
        });
      });
      onNext({ correct, total, pct: total > 0 ? Math.round(correct / total * 100) : 0 });
      return;
    }

    // Correction
    let correct = 0; let total = 0;
    const next: CellGrid = cells.map((rowCells, ri) => {
      const updated = { ...rowCells };
      columns.forEach(col => {
        if (col.key === rows[ri].given) return;
        total++;
        const cell = rowCells[col.key];
        const validator = rows[ri].validators?.[col.key];
        const ok = validator ? validator(cell.input) : approxEqStr(cell.input, rows[ri].answers[col.key]);
        if (ok) correct++;
        updated[col.key] = {
          ...cell,
          state: ok ? 'ok' : 'ko',
          correction: ok ? '' : rows[ri].answers[col.key],
        };
      });
      return updated;
    });

    setCells(next);
    setSubmitted(true);
    const pct = total > 0 ? Math.round(correct / total * 100) : 0;
    // On n'appelle PAS onNext ici — l'élève doit voir les corrections d'abord
    // puis recliquer "Suivant" pour continuer
    submitResult.current = { correct, total, pct };
  }

  // Stockage du résultat pour le 2e clic
  const submitResult = useRef<DrillResult>({ correct: 0, total: 0, pct: 0 });

  // Score affiché après correction
  const scoreDisplay = submitted ? (() => {
    let correct = 0; let total = 0;
    cells.forEach((rowCells, ri) => {
      columns.forEach(col => {
        if (col.key === rows[ri].given) return;
        total++;
        if (rowCells[col.key].state === 'ok') correct++;
      });
    });
    return { correct, total, pct: total > 0 ? Math.round(correct / total * 100) : 0 };
  })() : null;

  return (
    <div>
      {/* Tableau */}
      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              {columns.map(c => <th key={c.key} style={s.th}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {columns.map((col, ci) => {
                  if (col.key === row.given) {
                    return <td key={col.key} style={s.tdGiven}>{row.givenDisplay}</td>;
                  }
                  const cell = cells[ri]?.[col.key] ?? { input: '', state: 'idle', correction: '' };
                  return (
                    <td key={col.key} style={s.td}>
                      <input
                        ref={el => setRef(ri, ci, el)}
                        type="text"
                        value={cell.input}
                        disabled={submitted && cell.state === 'ok'}
                        onChange={e => updateCell(ri, col.key, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEnter(ri, ci); } }}
                        style={{
                          ...s.input,
                          ...(cell.state === 'ok' ? s.inputOk : {}),
                          ...(cell.state === 'ko' ? s.inputKo : {}),
                        }}
                        placeholder="—"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {/* Correction en dessous si faux */}
                      {cell.state === 'ko' && cell.correction && (
                        <div style={s.correctionArrow}>
                          ↳ {cell.correction}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Score après correction */}
      {submitted && scoreDisplay && (
        <div style={s.scoreRow}>
          <div style={s.scoreTrack}>
            <div style={{
              ...s.scoreFill,
              width: `${scoreDisplay.pct}%`,
              background: scoreDisplay.pct >= 85 ? '#97C459' : scoreDisplay.pct >= 70 ? '#EF9F27' : '#F09595',
            }} />
          </div>
          <span style={s.scoreText}>
            {scoreDisplay.correct}/{scoreDisplay.total} — {scoreDisplay.pct}%
          </span>
        </div>
      )}

      {/* Bouton Suivant fixe */}
      <div style={s.btnRow}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleSubmit}>
          {submitted ? 'Continuer →' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:      { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)',
             fontWeight: 500, padding: '7px 10px', border: '0.5px solid var(--color-border-tertiary)',
             textAlign: 'center', fontSize: '12px', whiteSpace: 'nowrap' },
  td:      { padding: '4px 6px', border: '0.5px solid var(--color-border-tertiary)',
             textAlign: 'center', verticalAlign: 'top' },
  tdGiven: { padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)',
             textAlign: 'center', fontWeight: 500, whiteSpace: 'nowrap',
             color: 'var(--color-text-primary)', verticalAlign: 'middle' },
  input:   { width: '100%', minWidth: '80px', height: '28px', fontSize: '13px',
             textAlign: 'center', border: '0.5px solid var(--color-border-secondary)',
             borderRadius: '6px', background: 'var(--color-background-primary)',
             color: 'var(--color-text-primary)', padding: '0 6px', outline: 'none',
             fontFamily: 'var(--font-mono)' },
  inputOk: { background: '#EAF3DE', borderColor: '#97C459', color: '#27500A' },
  inputKo: { background: '#FCEBEB', borderColor: '#F09595', color: '#791F1F' },
  correctionArrow: { fontSize: '11px', color: '#854F0B', marginTop: '3px',
                     fontFamily: 'var(--font-mono)', lineHeight: 1.3 },
  scoreRow:  { display: 'flex', alignItems: 'center', gap: '10px', margin: '0.75rem 0' },
  scoreTrack:{ flex: 1, height: '6px', borderRadius: '3px',
               background: 'var(--color-background-secondary)', overflow: 'hidden' },
  scoreFill: { height: '6px', borderRadius: '3px', transition: 'width 0.5s' },
  scoreText: { fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' },
  btnRow:    { marginTop: '1rem' },
  btn:       { fontSize: '13px', padding: '7px 18px', borderRadius: '8px', cursor: 'pointer',
               border: '0.5px solid var(--color-border-secondary)',
               background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' },
  btnPrimary:{ background: '#EAF3DE', color: '#3B6D11', borderColor: '#C0DD97' },
};