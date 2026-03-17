// ============================================================
// components/sciences/fiches-outils/DrillTable.tsx
// Composant générique : tableau 3 colonnes, vérif, score.
// Réutilisable pour toutes les fiches-outils à venir.
// ============================================================
'use client';

import { useState, useRef, useEffect } from 'react';

// ── Types publics ─────────────────────────────────────────────
export interface DrillColumn {
  key: string;
  label: string;
}

export interface DrillRowData {
  /** Clé de la colonne donnée */
  given: string;
  /** Texte affiché dans la colonne donnée */
  givenDisplay: string;
  /** Réponses attendues par clé de colonne */
  answers: Record<string, string>;
  /**
   * Fonction de vérification custom par colonne.
   * Reçoit la saisie brute, renvoie true si correct.
   * Si absent, on fait une comparaison approx numérique.
   */
  validators?: Record<string, (input: string) => boolean>;
}

interface DrillTableProps {
  columns: DrillColumn[];           // ex: [{key:'prefix',label:'Unité préfixée'}, …]
  rows: DrillRowData[];
  onAllCorrect?: () => void;        // appelé quand score = 100%
  onScoreChange?: (pct: number) => void;
}

type CellState = 'idle' | 'ok' | 'ko' | 'revealed';

interface CellValue {
  input: string;
  state: CellState;
}

// ── Composant ─────────────────────────────────────────────────
export default function DrillTable({
  columns,
  rows,
  onAllCorrect,
  onScoreChange,
}: DrillTableProps) {
  // cells[rowIdx][colKey]
  const [cells, setCells] = useState<CellValue[][]>(() =>
    rows.map(r =>
      Object.fromEntries(
        columns.map(c => [c.key, { input: '', state: 'idle' as CellState }])
      ) as unknown as CellValue[]
    )
  );
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset quand les lignes changent
  useEffect(() => {
    setCells(
      rows.map(() =>
        Object.fromEntries(
          columns.map(c => [c.key, { input: '', state: 'idle' as CellState }])
        ) as unknown as CellValue[]
      )
    );
    setChecked(false);
    setScore(null);
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateCell(rowIdx: number, colKey: string, input: string) {
    setCells(prev => {
      const next = prev.map(r => ({ ...r }));
      (next[rowIdx] as any)[colKey] = { input, state: 'idle' };
      return next;
    });
  }

  function handleCheck() {
    let correct = 0;
    let total = 0;

    const next = cells.map((rowCells, ri) => {
      const row = rows[ri];
      const updated = { ...rowCells } as any;
      for (const col of columns) {
        if (col.key === row.given) continue;
        total++;
        const cellVal: CellValue = (rowCells as any)[col.key];
        const validator = row.validators?.[col.key];
        let ok: boolean;
        if (validator) {
          ok = validator(cellVal.input);
        } else {
          ok = approxEqStr(cellVal.input, row.answers[col.key]);
        }
        if (ok) correct++;
        updated[col.key] = { input: cellVal.input, state: ok ? 'ok' : 'ko' };
      }
      return updated;
    });

    setCells(next);
    setChecked(true);
    const s = { correct, total };
    setScore(s);
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    onScoreChange?.(pct);
    if (pct === 100) onAllCorrect?.();
  }

  function handleReveal() {
    const next = cells.map((rowCells, ri) => {
      const row = rows[ri];
      const updated = { ...rowCells } as any;
      for (const col of columns) {
        if (col.key === row.given) continue;
        updated[col.key] = {
          input: row.answers[col.key],
          state: 'revealed' as CellState,
        };
      }
      return updated;
    });
    setCells(next);
    setChecked(true);
    setScore(null);
  }

  function handleReset() {
    setCells(
      rows.map(() =>
        Object.fromEntries(
          columns.map(c => [c.key, { input: '', state: 'idle' as CellState }])
        ) as unknown as CellValue[]
      )
    );
    setChecked(false);
    setScore(null);
  }

  const pct = score ? Math.round((score.correct / score.total) * 100) : null;

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} style={styles.th}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {columns.map((col, ci) => {
                  const isGiven = col.key === row.given;
                  if (isGiven) {
                    return (
                      <td key={col.key} style={styles.tdGiven}>
                        {row.givenDisplay}
                      </td>
                    );
                  }
                  const cell: CellValue = (cells[ri] as any)[col.key] ?? { input: '', state: 'idle' };
                  return (
                    <td key={col.key} style={styles.td}>
                      <input
                        ref={ri === 0 && ci === 0 ? firstInputRef : undefined}
                        type="text"
                        value={cell.input}
                        onChange={e => updateCell(ri, col.key, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCheck(); }}
                        style={{
                          ...styles.input,
                          ...(cell.state === 'ok' ? styles.inputOk : {}),
                          ...(cell.state === 'ko' ? styles.inputKo : {}),
                          ...(cell.state === 'revealed' ? styles.inputRevealed : {}),
                        }}
                        placeholder="—"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Score */}
      {score && (
        <div style={styles.scoreWrap}>
          <span style={styles.scoreLabel}>{score.correct}/{score.total}</span>
          <div style={styles.scoreTrack}>
            <div style={{ ...styles.scoreFill, width: `${pct}%`,
              background: pct === 100 ? '#97C459' : pct! >= 60 ? '#EF9F27' : '#F09595' }}
            />
          </div>
          <span style={styles.scoreLabel}>{pct}%</span>
        </div>
      )}

      {/* Actions */}
      <div style={styles.btnRow}>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleCheck}>
          Vérifier
        </button>
        <button style={styles.btn} onClick={handleReveal}>
          Corrections
        </button>
        <button style={styles.btn} onClick={handleReset}>
          Réinitialiser
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────
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

// ── Styles ─────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    background: 'var(--color-background-secondary)',
    color: 'var(--color-text-secondary)',
    fontWeight: 500,
    padding: '7px 10px',
    border: '0.5px solid var(--color-border-tertiary)',
    textAlign: 'center',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '4px 6px',
    border: '0.5px solid var(--color-border-tertiary)',
    textAlign: 'center',
  },
  tdGiven: {
    padding: '6px 10px',
    border: '0.5px solid var(--color-border-tertiary)',
    textAlign: 'center',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    color: 'var(--color-text-primary)',
  },
  input: {
    width: '100%',
    minWidth: '80px',
    height: '28px',
    fontSize: '13px',
    textAlign: 'center',
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: '6px',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
    padding: '0 6px',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
  },
  inputOk: {
    background: '#EAF3DE',
    borderColor: '#97C459',
    color: '#27500A',
  },
  inputKo: {
    background: '#FCEBEB',
    borderColor: '#F09595',
    color: '#791F1F',
  },
  inputRevealed: {
    background: '#FAEEDA',
    borderColor: '#FAC775',
    color: '#633806',
  },
  scoreWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '0.75rem',
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
  },
  scoreLabel: { minWidth: '32px', fontSize: '13px' },
  scoreTrack: {
    flex: 1,
    height: '5px',
    borderRadius: '3px',
    background: 'var(--color-background-secondary)',
    overflow: 'hidden',
  },
  scoreFill: {
    height: '5px',
    borderRadius: '3px',
    transition: 'width 0.4s',
  },
  btnRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '1rem',
    flexWrap: 'wrap' as const,
  },
  btn: {
    fontSize: '12px',
    padding: '5px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '0.5px solid var(--color-border-secondary)',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
  },
  btnPrimary: {
    background: '#EAF3DE',
    color: '#3B6D11',
    borderColor: '#C0DD97',
  },
};