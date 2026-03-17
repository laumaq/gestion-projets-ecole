// ============================================================
// app/tools/sciences/fiches-outils/page.tsx
// Dashboard fiches-outils : vue élève + panneau enseignant
// ============================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FICHES_OUTILS, FICHE_COLOR_MAP, FicheOutil } from '@/lib/sciences/fiches-outils/registry';
import {
  attribuerFiche,
  getStudentsByClasses,
  getStudentsByGroupes,
  computeStatut,
  FicheStatut,
  STATUT_LABELS,
  STATUT_COLORS,
} from '@/lib/sciences/fiches-outils/attribution';

// ── Types ──────────────────────────────────────────────────────
interface StudentRow {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  niveau: string;
  [key: string]: string | number | null;
}

// ── Page ───────────────────────────────────────────────────────
export default function FichesOutilsDashboard() {
  const router = useRouter();
  const [userType, setUserType]   = useState<'employee' | 'student'>('student');
  const [userId, setUserId]       = useState('');
  const [userName, setUserName]   = useState('');
  const [userClass, setUserClass] = useState('');
  const [userLevel, setUserLevel] = useState('');
  const [userJob, setUserJob]     = useState('');

  useEffect(() => {
    const type  = localStorage.getItem('userType') as 'employee' | 'student';
    const id    = localStorage.getItem('userId') ?? '';
    const name  = localStorage.getItem('userName') ?? '';
    const cls   = localStorage.getItem('userClass') ?? '';
    const level = localStorage.getItem('userLevel') ?? '';
    const job   = localStorage.getItem('userJob') ?? '';
    if (!type || !id) { router.push('/'); return; }
    setUserType(type); setUserId(id); setUserName(name);
    setUserClass(cls); setUserLevel(level); setUserJob(job);
  }, [router]);

  if (!userId) return null;

  return userType === 'student'
    ? <StudentView matricule={parseInt(userId)} classe={userClass} niveau={userLevel} />
    : <TeacherView employeeId={userId} />;
}

// ══════════════════════════════════════════════════════════════
// VUE ÉLÈVE
// ══════════════════════════════════════════════════════════════
function StudentView({ matricule, classe, niveau }: { matricule: number; classe: string; niveau: string }) {
  const [fiches, setFiches] = useState<{ fiche: FicheOutil; statut: FicheStatut }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('fiches_outils_progression')
        .select('*')
        .eq('student_id', matricule)
        .maybeSingle();

      const row = (data ?? {}) as unknown as Record<string, string | null>;
      const result = FICHES_OUTILS.map(f => ({
        fiche: f,
        statut: computeStatut(row, f.key),
      })).filter(({ statut }) => statut !== 'not_attributed');

      setFiches(result);
      setLoading(false);
    };
    load();
  }, [matricule]);

  if (loading) return <LoadingSpinner />;

  return (
    <main style={styles.main}>
      <PageHeader
        title="Fiches-outils"
        subtitle="Tes exercices et rappels théoriques"
      />

      {fiches.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Aucune fiche attribuée"
          message="Tes professeurs n'ont pas encore attribué de fiche-outil à ta classe."
        />
      ) : (
        <>
          {/* Résumé */}
          <div style={styles.statsRow}>
            {(['attributed','opened','succeeded'] as FicheStatut[]).map(s => {
              const count = fiches.filter(f => f.statut === s).length;
              return (
                <div key={s} style={styles.statCard}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {STATUT_LABELS[s]}
                  </span>
                  <span style={{ fontSize: '22px', fontWeight: 500 }}>{count}</span>
                </div>
              );
            })}
          </div>

          <div style={styles.grid}>
            {fiches.map(({ fiche, statut }) => (
              <FicheCard key={fiche.key} fiche={fiche} statut={statut} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

// ── Carte fiche (réutilisée dans les deux vues) ───────────────
function FicheCard({ fiche, statut }: { fiche: FicheOutil; statut: FicheStatut }) {
  const c = FICHE_COLOR_MAP[fiche.color];
  const s = STATUT_COLORS[statut];
  return (
    <Link href={fiche.href} style={{ display: 'block', height: '100%' }}>
      <div style={{
        ...styles.ficheCard,
        borderColor: c.border,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ ...styles.ficheIconWrap, background: c.bg }}>
            <FicheIcon name={fiche.icon} color={c.text} />
          </div>
          <span style={{ ...styles.statutBadge, background: s.bg, color: s.text, border: `0.5px solid ${s.border}` }}>
            {STATUT_LABELS[statut]}
          </span>
        </div>
        <h3 style={styles.ficheTitle}>{fiche.title}</h3>
        <p style={styles.ficheDesc}>{fiche.description}</p>
        <span style={{ ...styles.subjectBadge, background: c.bg, color: c.text }}>
          {fiche.subject}
        </span>
      </div>
    </Link>
  );
}

// ══════════════════════════════════════════════════════════════
// VUE ENSEIGNANT
// ══════════════════════════════════════════════════════════════
function TeacherView({ employeeId }: { employeeId: string }) {
  const [tab, setTab] = useState<'attribution' | 'progression'>('attribution');

  return (
    <main style={styles.main}>
      <PageHeader
        title="Fiches-outils"
        subtitle="Attribuer des fiches et suivre la progression des élèves"
      />
      <div style={styles.tabs}>
        {([
          { id: 'attribution', label: 'Attribuer' },
          { id: 'progression', label: 'Progression des élèves' },
        ] as const).map(t => (
          <button key={t.id}
            style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'attribution'  && <AttributionPanel />}
      {tab === 'progression'  && <ProgressionPanel />}
    </main>
  );
}

// ── Panneau Attribution ───────────────────────────────────────
function AttributionPanel() {
  const [selectedFiche, setSelectedFiche] = useState<string>(FICHES_OUTILS[0]?.key ?? '');
  const [targetType, setTargetType]       = useState<'classe' | 'groupe'>('classe');
  const [classes, setClasses]             = useState<string[]>([]);
  const [groupes, setGroupes]             = useState<string[]>([]);
  const [allClasses, setAllClasses]       = useState<string[]>([]);
  const [allGroupes, setAllGroupes]       = useState<string[]>([]);
  const [selected, setSelected]           = useState<string[]>([]);
  const [loading, setLoading]             = useState(false);
  const [feedback, setFeedback]           = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    supabase.from('students').select('classe').then(({ data }) => {
      const uniq = Array.from(new Set((data ?? []).map((r: any) => r.classe as string))).sort();
      setAllClasses(uniq);
    });
    supabase.from('students_groups').select('groupe_code').then(({ data }) => {
      const uniq = Array.from(new Set((data ?? []).map((r: any) => r.groupe_code as string))).sort();
      setAllGroupes(uniq);
    });
  }, []);

  function toggleItem(item: string) {
    setSelected(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  }

  async function handleAttribuer() {
    if (!selectedFiche || selected.length === 0) return;
    setLoading(true);
    setFeedback(null);
    try {
      let ids: number[] = [];
      if (targetType === 'classe') ids = await getStudentsByClasses(selected);
      else                          ids = await getStudentsByGroupes(selected);

      if (ids.length === 0) {
        setFeedback({ type: 'err', msg: 'Aucun élève trouvé pour cette sélection.' });
        return;
      }
      await attribuerFiche(selectedFiche, ids);
      setFeedback({ type: 'ok', msg: `Fiche attribuée à ${ids.length} élève${ids.length > 1 ? 's' : ''}.` });
      setSelected([]);
    } catch (e) {
      setFeedback({ type: 'err', msg: 'Erreur lors de l\'attribution.' });
    } finally {
      setLoading(false);
    }
  }

  const items = targetType === 'classe' ? allClasses : allGroupes;

  return (
    <div style={styles.card}>

      {/* Choix de la fiche */}
      <SectionLabel>Fiche à attribuer</SectionLabel>
      <div style={styles.ficheGrid}>
        {FICHES_OUTILS.map(f => {
          const c = FICHE_COLOR_MAP[f.color];
          const active = selectedFiche === f.key;
          return (
            <button key={f.key}
              onClick={() => setSelectedFiche(f.key)}
              style={{
                ...styles.fichePickBtn,
                borderColor: active ? c.border : 'var(--color-border-tertiary)',
                background:  active ? c.bg : 'var(--color-background-primary)',
              }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: active ? c.text : 'var(--color-text-primary)' }}>
                {f.title}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{f.subject}</span>
            </button>
          );
        })}
      </div>

      <div style={{ height: '1px', background: 'var(--color-border-tertiary)', margin: '1.25rem 0' }} />

      {/* Cible */}
      <SectionLabel>Attribuer à</SectionLabel>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
        {(['classe', 'groupe'] as const).map(t => (
          <button key={t}
            style={{ ...styles.tab, ...(targetType === t ? styles.tabActive : {}) }}
            onClick={() => { setTargetType(t); setSelected([]); }}>
            {t === 'classe' ? 'Classes' : 'Groupes pédagogiques'}
          </button>
        ))}
      </div>

      <div style={styles.itemGrid}>
        {items.map(item => {
          const active = selected.includes(item);
          return (
            <button key={item}
              onClick={() => toggleItem(item)}
              style={{
                ...styles.itemBtn,
                background:  active ? '#EAF3DE' : 'var(--color-background-primary)',
                borderColor: active ? '#97C459'  : 'var(--color-border-tertiary)',
                color:       active ? '#3B6D11'  : 'var(--color-text-primary)',
              }}>
              {item}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
          {selected.length} {targetType === 'classe' ? 'classe(s)' : 'groupe(s)'} sélectionné(s)
        </p>
      )}

      {feedback && (
        <div style={{
          ...styles.feedback,
          background: feedback.type === 'ok' ? '#EAF3DE' : '#FCEBEB',
          color:      feedback.type === 'ok' ? '#3B6D11' : '#A32D2D',
          borderColor:feedback.type === 'ok' ? '#C0DD97' : '#F09595',
        }}>
          {feedback.msg}
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading || selected.length === 0 ? 0.5 : 1 }}
          onClick={handleAttribuer}
          disabled={loading || selected.length === 0}>
          {loading ? 'Attribution…' : `Attribuer la fiche`}
        </button>
        {selected.length > 0 && (
          <button style={styles.btn} onClick={() => setSelected([])}>Effacer la sélection</button>
        )}
      </div>

      {/* Accès direct aux fiches pour l'enseignant */}
      <div style={{ height: '1px', background: 'var(--color-border-tertiary)', margin: '1.5rem 0' }} />
      <SectionLabel>Accéder à une fiche</SectionLabel>
      <div style={styles.ficheGrid}>
        {FICHES_OUTILS.map(f => (
          <FicheCard key={f.key} fiche={f} statut="attributed" />
        ))}
      </div>
    </div>
  );
}

// ── Panneau Progression ───────────────────────────────────────
function ProgressionPanel() {
  const [filterClasse, setFilterClasse] = useState('');
  const [filterFiche,  setFilterFiche]  = useState(FICHES_OUTILS[0]?.key ?? '');
  const [classes,      setClasses]      = useState<string[]>([]);
  const [rows,         setRows]         = useState<StudentRow[]>([]);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    supabase.from('students').select('classe').then(({ data }) => {
      const uniq = Array.from(new Set((data ?? []).map((r: any) => r.classe as string))).sort();
      setClasses(uniq);
      if (uniq.length > 0) setFilterClasse(uniq[0]);
    });
  }, []);

  useEffect(() => {
    if (!filterClasse) return;
    setLoading(true);
    supabase
      .from('v_fiches_outils_progression')
      .select('*')
      .eq('classe', filterClasse)
      .order('nom')
      .then(({ data }) => {
        setRows((data ?? []) as StudentRow[]);
        setLoading(false);
      });
  }, [filterClasse]);

  const statuts: FicheStatut[] = ['succeeded', 'opened', 'attributed', 'not_attributed'];
  const counts = statuts.reduce((acc, s) => {
    acc[s] = rows.filter(r => computeStatut(r as any, filterFiche) === s).length;
    return acc;
  }, {} as Record<FicheStatut, number>);

  return (
    <div style={styles.card}>
      {/* Filtres */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
        <div>
          <label style={styles.filterLabel}>Classe</label>
          <select style={styles.select} value={filterClasse} onChange={e => setFilterClasse(e.target.value)}>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={styles.filterLabel}>Fiche</label>
          <select style={styles.select} value={filterFiche} onChange={e => setFilterFiche(e.target.value)}>
            {FICHES_OUTILS.map(f => <option key={f.key} value={f.key}>{f.title}</option>)}
          </select>
        </div>
      </div>

      {/* Stats rapides */}
      <div style={styles.statsRow}>
        {statuts.map(s => (
          <div key={s} style={{ ...styles.statCard, borderLeft: `3px solid ${STATUT_COLORS[s].border}` }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{STATUT_LABELS[s]}</span>
            <span style={{ fontSize: '20px', fontWeight: 500, color: STATUT_COLORS[s].text }}>{counts[s]}</span>
          </div>
        ))}
      </div>

      {/* Barre de progression globale */}
      {rows.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '1px' }}>
            {statuts.filter(s => counts[s] > 0).map(s => (
              <div key={s} style={{
                flex: counts[s],
                background: STATUT_COLORS[s].border,
              }} title={`${STATUT_LABELS[s]} : ${counts[s]}`} />
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {counts.succeeded} / {rows.length} élèves ont réussi
          </p>
        </div>
      )}

      {/* Tableau élèves */}
      {loading ? <LoadingSpinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ ...styles.table, fontSize: '13px' }}>
            <thead>
              <tr>
                {['Élève', 'Classe', 'Statut', 'Attribuée le', 'Ouverte le', 'Réussie le'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const statut = computeStatut(r as any, filterFiche);
                const sc = STATUT_COLORS[statut];
                return (
                  <tr key={r.matricule}>
                    <td style={styles.td}>{r.prenom} {r.nom}</td>
                    <td style={{ ...styles.td, color: 'var(--color-text-secondary)' }}>{r.classe}</td>
                    <td style={styles.td}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500,
                        background: sc.bg, color: sc.text, border: `0.5px solid ${sc.border}`,
                      }}>
                        {STATUT_LABELS[statut]}
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {fmtDate(r[`${filterFiche}_attributed_at`] as string | null)}
                    </td>
                    <td style={{ ...styles.td, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {fmtDate(r[`${filterFiche}_opened_at`] as string | null)}
                    </td>
                    <td style={{ ...styles.td, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {fmtDate(r[`${filterFiche}_succeeded_at`] as string | null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Micro-composants ─────────────────────────────────────────
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
        Sciences · Fiches-outils
      </p>
      <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '4px' }}>{title}</h1>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{subtitle}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)',
      textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.6rem' }}>
      {children}
    </p>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid var(--color-border-tertiary)',
        borderTop: '2px solid #639922', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        margin: '0 auto' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: '12px', background: 'var(--color-background-primary)' }}>
      <div style={{ fontSize: '32px', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{message}</p>
    </div>
  );
}

function FicheIcon({ name, color }: { name: FicheOutil['icon']; color: string }) {
  const paths: Record<FicheOutil['icon'], string> = {
    ruler:     'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
    atom:      'M12 12c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm0 0c1.105 0 2 .895 2 2s-.895 2-2 2-2-.895-2-2 .895-2 2-2zm0 0V4m0 8h8M4 12h8',
    function:  'M4.745 3A23.933 23.933 0 003 12c0 3.183.62 6.22 1.745 9M19.255 3A23.933 23.933 0 0121 12c0 3.183-.62 6.22-1.745 9M8.25 8.885l1.444-.89a.75.75 0 011.105.402l2.402 7.206a.75.75 0 001.104.401l1.445-.889m-8.25.75l.213.09a1.687 1.687 0 002.062-.617l4.45-6.676a1.688 1.688 0 012.062-.618l.213.09',
    flask:     'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 00.244-3.835M19.8 15l-1.8 1.8M5 14.5a2.25 2.25 0 00-.244 3.835M5 14.5l1.8 1.8m12.244 0A2.25 2.25 0 0117.25 21H6.75a2.25 2.25 0 01-2.044-3.165l1.044-2.088',
    lightning: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  };
  return (
    <svg width="18" height="18" fill="none" stroke={color} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name]} />
    </svg>
  );
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ── Styles ─────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  main:       { maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' },
  card:       { border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px',
                padding: '1.25rem', background: 'var(--color-background-primary)', marginBottom: '1rem' },
  tabs:       { display: 'flex', gap: '4px', marginBottom: '1.25rem' },
  tab:        { fontSize: '13px', padding: '5px 14px', borderRadius: '20px', cursor: 'pointer',
                border: '0.5px solid var(--color-border-tertiary)', color: 'var(--color-text-secondary)',
                background: 'var(--color-background-primary)' },
  tabActive:  { background: '#EAF3DE', color: '#3B6D11', borderColor: '#C0DD97' },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' },
  ficheGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '0.5rem' },
  ficheCard:  { height: '100%', background: 'var(--color-background-primary)', borderRadius: '10px',
                border: '2px solid', padding: '1rem',
                cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
                display: 'flex', flexDirection: 'column', gap: '6px' },
  ficheIconWrap: { width: '34px', height: '34px', borderRadius: '8px',
                   display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ficheTitle: { fontSize: '14px', fontWeight: 500, lineHeight: 1.3 },
  ficheDesc:  { fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4, flex: 1 },
  subjectBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                  fontWeight: 500, alignSelf: 'flex-start' as const },
  statutBadge:  { fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500,
                  whiteSpace: 'nowrap' as const },
  statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '8px', marginBottom: '1.25rem' },
  statCard:   { background: 'var(--color-background-secondary)', borderRadius: '8px',
                padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  fichePickBtn: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start',
                  padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: '0.5px solid', textAlign: 'left' as const, gap: '2px' },
  itemGrid:   { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', maxHeight: '200px',
                overflowY: 'auto' as const },
  itemBtn:    { fontSize: '12px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                border: '0.5px solid', fontWeight: 500 },
  feedback:   { fontSize: '13px', padding: '8px 12px', borderRadius: '8px',
                marginTop: '1rem', border: '0.5px solid' },
  table:      { width: '100%', borderCollapse: 'collapse' as const },
  th:         { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)',
                fontWeight: 500, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)',
                textAlign: 'left' as const, fontSize: '12px', whiteSpace: 'nowrap' as const },
  td:         { padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', fontSize: '13px' },
  filterLabel:{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)',
                marginBottom: '3px', textTransform: 'uppercase' as const, letterSpacing: '.04em' },
  select:     { fontSize: '13px', padding: '4px 8px', borderRadius: '6px',
                border: '0.5px solid var(--color-border-secondary)',
                background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
                cursor: 'pointer' },
  btn:        { fontSize: '12px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                border: '0.5px solid var(--color-border-secondary)',
                background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' },
  btnPrimary: { background: '#EAF3DE', color: '#3B6D11', borderColor: '#C0DD97' },
};