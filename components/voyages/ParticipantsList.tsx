//components/voyages/ParticipantsList.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

interface Props {
  voyageId: string;
  isResponsable: boolean;
  userType: 'employee' | 'student' | null;
}

// ── Régime alimentaire (JSONB) ────────────────────────────────────────────────

interface RegimeAlimentaire {
  regime: 'Omnivore' | 'Végétarien' | 'Halal';
  notes: string;
}

const REGIMES = ['Omnivore', 'Végétarien', 'Halal'] as const;

function parseRegime(raw: any): RegimeAlimentaire {
  if (!raw) return { regime: 'Végétarien', notes: '' };
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return { regime: 'Végétarien', notes: '' }; }
  }
  return {
    regime: REGIMES.includes(raw.regime) ? raw.regime : 'Végétarien',
    notes: raw.notes ?? '',
  };
}

// ── Composant RegimeCell ──────────────────────────────────────────────────────
// Menu déroulant régime + astérisque rouge si notes + popover d'édition

function RegimeCell({
  regime,
  canEdit,
  onUpdate,
}: {
  regime: RegimeAlimentaire;
  canEdit: boolean;
  onUpdate: (r: RegimeAlimentaire) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RegimeAlimentaire>(regime);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => { setDraft(regime); }, [regime.regime, regime.notes]);

  const hasNotes = !!regime.notes.trim();

  const REGIME_COLORS: Record<string, string> = {
    Omnivore: 'bg-gray-100 text-gray-700',
    Végétarien: 'bg-green-100 text-green-700',
    Halal: 'bg-blue-100 text-blue-700',
  };

  return (
    <div ref={ref} className="relative inline-block">
      <div className="flex items-center gap-1 flex-wrap">
        {canEdit ? (
          <select
            value={draft.regime}
            onChange={e => {
              const updated = { ...draft, regime: e.target.value as RegimeAlimentaire['regime'] };
              setDraft(updated);
              onUpdate(updated);
            }}
            className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${REGIME_COLORS[draft.regime]}`}
          >
            {REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REGIME_COLORS[regime.regime]}`}>
            {regime.regime}
          </span>
        )}

        {/* Bouton notes */}
        <button
          onClick={() => setOpen(!open)}
          className={`text-xs leading-none px-1 rounded transition-colors ${
            hasNotes
              ? 'text-red-500 font-bold hover:text-red-700'
              : canEdit ? 'text-gray-300 hover:text-gray-500' : 'hidden'
          }`}
          title={hasNotes ? regime.notes : 'Ajouter des notes'}
        >
          {hasNotes ? '*' : canEdit ? '+' : ''}
        </button>
      </div>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            Allergies / intolérances / spécificités
          </p>
          {canEdit ? (
            <>
              <textarea
                value={draft.notes}
                onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                placeholder="Ex : allergie aux noix, intolérance lactose..."
                rows={3}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => { setDraft(regime); setOpen(false); }} className="text-xs text-gray-500 hover:text-gray-700">
                  Annuler
                </button>
                <button
                  onClick={() => { onUpdate(draft); setOpen(false); }}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{regime.notes || 'Aucune note.'}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  niveau: number;
  sexe: string;
  date_naissance: string | null;
  nationalite: string | null;
  regime_alimentaire: any;
}

interface Professeur {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  email: string | null;
  date_naissance?: string | null;
  nationalite?: string | null;
  regime_alimentaire?: any;
}

interface Participant {
  id: string;
  eleve_id: number;
  statut: string;
  genre: string;
  classe: string;
  type: 'eleve';
  eleve: Eleve;
}

interface ProfesseurParticipant {
  id: string;
  professeur_id: string;
  role: string;
  type: 'professeur';
  professeur: Professeur;
}

type ParticipantUnion = Participant | ProfesseurParticipant;

// ── Tri ───────────────────────────────────────────────────────────────────────

const STATUT_ORDER: Record<string, number> = { liste_attente: 0, confirme: 1, annule: 2 };

function trierParticipants(list: Participant[]): Participant[] {
  return [...list].sort((a, b) => {
    const diff = (STATUT_ORDER[a.statut] ?? 1) - (STATUT_ORDER[b.statut] ?? 1);
    if (diff !== 0) return diff;
    if (a.classe !== b.classe) return a.classe.localeCompare(b.classe);
    if (a.eleve.nom !== b.eleve.nom) return a.eleve.nom.localeCompare(b.eleve.nom);
    return a.eleve.prenom.localeCompare(b.eleve.prenom);
  });
}

// ── Modal export ──────────────────────────────────────────────────────────────

interface ExportConfig {
  colonnes: {
    nom: boolean; prenom: boolean; classe: boolean; genre: boolean; statut: boolean;
    date_naissance: boolean; nationalite: boolean; regime: boolean; notes_regime: boolean;
  };
  statuts: { confirme: boolean; liste_attente: boolean; annule: boolean };
  inclure_profs: boolean;
  colonne_type: boolean;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
}

function ModalExport({ participants, professeursParticipants, isResponsable, isEmployee, onClose }: {
  participants: Participant[];
  professeursParticipants: ProfesseurParticipant[];
  isResponsable: boolean;
  isEmployee: boolean;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<ExportConfig>({
    colonnes: {
      nom: true, prenom: true, classe: true, genre: true, statut: true,
      date_naissance: isResponsable, nationalite: isResponsable,
      regime: isEmployee, notes_regime: isEmployee,
    },
    statuts: { confirme: true, liste_attente: true, annule: false },
    inclure_profs: true,
    colonne_type: true,
    dateFormat: 'DD/MM/YYYY',
  });

  const formatDate = (raw: string | null | undefined): string => {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getUTCFullYear());
    switch (config.dateFormat) {
      case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
      case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
      default:           return `${dd}/${mm}/${yyyy}`;
    }
  };

  const toggleCol = (k: keyof ExportConfig['colonnes']) =>
    setConfig(c => ({ ...c, colonnes: { ...c.colonnes, [k]: !c.colonnes[k] } }));
  const toggleStatut = (k: keyof ExportConfig['statuts']) =>
    setConfig(c => ({ ...c, statuts: { ...c.statuts, [k]: !c.statuts[k] } }));

  const SLABELS: Record<string, string> = { confirme: 'Confirmé', liste_attente: "Liste d'attente", annule: 'Annulé' };
  const GLABELS: Record<string, string> = { M: 'Garçon', G: 'Garçon', F: 'Fille' };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const c = config.colonnes;

    // ── En-têtes ──────────────────────────────────────────────────────────
    const header: string[] = [];
    if (config.inclure_profs && config.colonne_type) header.push('Type');
    if (c.nom) header.push('Nom');
    if (c.prenom) header.push('Prénom');
    if (c.classe) header.push('Classe / Rôle');
    if (c.genre) header.push('Genre');
    if (c.statut) header.push('Statut');
    if (c.date_naissance) header.push('Date de naissance');
    if (c.nationalite) header.push('Nationalité');
    if (c.regime) header.push('Régime alimentaire');
    if (c.notes_regime) header.push('Allergies / notes régime');

    const rows: (string | null)[][] = [];

    // ── Lignes élèves ─────────────────────────────────────────────────────
    const elevesFiltered = trierParticipants(participants).filter(
      p => config.statuts[p.statut as keyof ExportConfig['statuts']]
    );

    elevesFiltered.forEach(p => {
      const r = parseRegime(p.eleve.regime_alimentaire);
      const row: (string | null)[] = [];
      if (config.inclure_profs && config.colonne_type) row.push('Élève');
      if (c.nom) row.push(p.eleve.nom);
      if (c.prenom) row.push(p.eleve.prenom);
      if (c.classe) row.push(p.classe);
      if (c.genre) row.push(GLABELS[p.genre] ?? p.genre);
      if (c.statut) row.push(SLABELS[p.statut] ?? p.statut);
      if (c.date_naissance) row.push(formatDate(p.eleve.date_naissance));
      if (c.nationalite) row.push(p.eleve.nationalite ?? '');
      if (c.regime) row.push(r.regime);
      if (c.notes_regime) row.push(r.notes);
      rows.push(row);
    });

    // ── Lignes profs (après les élèves) ───────────────────────────────────
    if (config.inclure_profs) {
      [...professeursParticipants]
        .sort((a, b) => a.professeur.nom.localeCompare(b.professeur.nom))
        .forEach(p => {
          const r = parseRegime(p.professeur.regime_alimentaire);
          const row: (string | null)[] = [];
          if (config.colonne_type) row.push('Professeur');
          if (c.nom) row.push(p.professeur.nom);
          if (c.prenom) row.push(p.professeur.prenom);
          if (c.classe) row.push(p.role);
          if (c.genre) row.push('');
          if (c.statut) row.push('');
          if (c.date_naissance) row.push(formatDate(p.professeur.date_naissance));
          if (c.nationalite) row.push(p.professeur.nationalite ?? '');
          if (c.regime) row.push(r.regime);
          if (c.notes_regime) row.push(r.notes);
          rows.push(row);
        });
    }

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = header.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Participants');

    XLSX.writeFile(wb, 'participants_voyage.xlsx');
    onClose();
  };

  const nbEleves = participants.filter(p => config.statuts[p.statut as keyof ExportConfig['statuts']]).length;
  const nbTotal = nbEleves + (config.inclure_profs ? professeursParticipants.length : 0);

  const COLS: [keyof ExportConfig['colonnes'], string, boolean][] = [
    ['nom', 'Nom', true], ['prenom', 'Prénom', true],
    ['classe', 'Classe / Rôle', true], ['genre', 'Genre', true], ['statut', 'Statut', true],
    ['date_naissance', 'Date de naissance', isResponsable],
    ['nationalite', 'Nationalité', isResponsable],
    ['regime', 'Régime alimentaire', isEmployee],
    ['notes_regime', 'Allergies / notes', isEmployee],
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Exporter en Excel</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-6">

          {/* Statuts */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Statuts élèves à inclure</p>
            <div className="flex gap-4">
              {(['confirme', 'liste_attente', 'annule'] as const).map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={config.statuts[s]} onChange={() => toggleStatut(s)} className="rounded" />
                  {SLABELS[s]}
                </label>
              ))}
            </div>
          </div>

          {/* Colonnes */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Colonnes</p>
            <div className="grid grid-cols-2 gap-2">
              {COLS.filter(([,, v]) => v).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={config.colonnes[k]} onChange={() => toggleCol(k)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Profs */}
          {professeursParticipants.length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={config.inclure_profs}
                  onChange={() => setConfig(c => ({ ...c, inclure_profs: !c.inclure_profs }))} className="rounded" />
                Inclure les professeurs ({professeursParticipants.length}) après les élèves
              </label>
              {config.inclure_profs && (
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 ml-6">
                  <input type="checkbox" checked={config.colonne_type}
                    onChange={() => setConfig(c => ({ ...c, colonne_type: !c.colonne_type }))} className="rounded" />
                  Ajouter une colonne "Type" (Élève / Professeur)
                </label>
              )}
            </div>
          )}

          {/* Format de date — uniquement si la colonne date est cochée */}
          {config.colonnes.date_naissance && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Format des dates</p>
              <div className="flex gap-3">
                {([
                  ['DD/MM/YYYY', '31/12/2010'],
                  ['MM/DD/YYYY', '12/31/2010'],
                  ['YYYY-MM-DD', '2010-12-31'],
                ] as [ExportConfig['dateFormat'], string][]).map(([fmt, ex]) => (
                  <label key={fmt} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="dateFormat"
                      checked={config.dateFormat === fmt}
                      onChange={() => setConfig(c => ({ ...c, dateFormat: fmt }))}
                      className="rounded"
                    />
                    <span className="font-mono">{fmt}</span>
                    <span className="text-gray-400 text-xs">({ex})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            {nbTotal} ligne{nbTotal > 1 ? 's' : ''} dans la feuille "Participants"
            {config.inclure_profs && professeursParticipants.length > 0
              ? ` (${nbEleves} élève${nbEleves > 1 ? 's' : ''} + ${professeursParticipants.length} professeur${professeursParticipants.length > 1 ? 's' : ''})`
              : ''}
          </p>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">Annuler</button>
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            ⬇ Télécharger Excel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ParticipantsList({ voyageId, isResponsable, userType }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [professeursParticipants, setProfesseursParticipants] = useState<ProfesseurParticipant[]>([]);
  const [elevesDisponibles, setElevesDisponibles] = useState<Eleve[]>([]);
  const [professeursDisponibles, setProfesseursDisponibles] = useState<Professeur[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [addMode, setAddMode] = useState<'individuel' | 'classe' | 'niveau' | 'prof'>('individuel');
  const [selectedEleves, setSelectedEleves] = useState<Set<number>>(new Set());
  const [selectedProfesseurs, setSelectedProfesseurs] = useState<Set<string>>(new Set());
  const [classesDisponibles, setClassesDisponibles] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedProfRole, setSelectedProfRole] = useState('accompagnateur');
  const [userId, setUserId] = useState<string>('');
  const [editingSelfProf, setEditingSelfProf] = useState(false);
  const [selfDraft, setSelfDraft] = useState({ date_naissance: '', nationalite: '' });

  const canEdit = userType === 'employee' && isResponsable;
  const isEmployee = userType === 'employee';

  useEffect(() => {
    const id = localStorage.getItem('userId') ?? '';
    setUserId(id);
  }, []);

  useEffect(() => { loadParticipants(); loadProfesseursParticipants(); }, [voyageId]);

  useEffect(() => {
    if (showAddModal && canEdit) {
      loadClassesDisponibles();
      setElevesDisponibles([]); setProfesseursDisponibles([]);
      setSelectedEleves(new Set()); setSelectedProfesseurs(new Set());
      setSearchTerm(''); setSelectedClasse(''); setSelectedNiveau('');
    }
  }, [showAddModal, userType]);

  useEffect(() => {
    if (!showAddModal || !canEdit) return;
    if (addMode === 'individuel' || addMode === 'classe' || addMode === 'niveau') {
      const t = setTimeout(loadElevesDisponibles, 300);
      return () => clearTimeout(t);
    }
  }, [searchTerm, selectedClasse, selectedNiveau, addMode, showAddModal, userType]);

  useEffect(() => {
    if (showAddModal && canEdit && addMode === 'prof') loadProfesseursDisponibles();
  }, [searchTerm, addMode, showAddModal, userType]);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadClassesDisponibles = async () => {
    setLoadingClasses(true);
    const { data } = await supabase.from('students').select('classe').order('classe');
    if (data) setClassesDisponibles(Array.from(new Set(data.map((i: any) => i.classe))).sort());
    setLoadingClasses(false);
  };

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from('voyage_participants')
      .select(`*, eleve:students!inner(
        matricule, nom, prenom, classe, niveau, sexe,
        date_naissance, nationalite, regime_alimentaire
      )`)
      .eq('voyage_id', voyageId);
    if (!error && data) setParticipants(data);
  };

  const loadProfesseursParticipants = async () => {
    // On essaie d'abord avec les nouvelles colonnes, fallback sans si elles n'existent pas encore
    let data: any[] | null = null;
    let error: any = null;

    const res = await supabase
      .from('voyage_professeurs')
      .select(`*, professeur:employees(
        id, nom, prenom, initiale, email,
        date_naissance, nationalite, regime_alimentaire
      )`)
      .eq('voyage_id', voyageId);

    if (res.error) {
      // Fallback sans les nouvelles colonnes (avant migration SQL)
      const res2 = await supabase
        .from('voyage_professeurs')
        .select(`*, professeur:employees(id, nom, prenom, initiale, email)`)
        .eq('voyage_id', voyageId);
      data = res2.data; error = res2.error;
    } else {
      data = res.data; error = res.error;
    }

    if (!error && data)
      setProfesseursParticipants(data.map((i: any) => ({ ...i, type: 'professeur', professeur: i.professeur })));
    setLoading(false);
  };

  const loadElevesDisponibles = async () => {
    const ids = participants.map(p => p.eleve_id);
    let q = supabase.from('students').select('*').order('classe').order('nom');
    if (ids.length > 0) q = q.not('matricule', 'in', `(${ids.join(',')})`);
    if (addMode === 'niveau' && selectedNiveau !== '') q = q.eq('niveau', selectedNiveau);
    else if (addMode === 'classe' && selectedClasse) q = q.eq('classe', selectedClasse);
    if (searchTerm) q = q.or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%`);
    q = q.limit(200);
    const { data } = await q;
    if (data) setElevesDisponibles(data);
  };

  const loadProfesseursDisponibles = async () => {
    const ids = professeursParticipants.map(p => p.professeur_id);
    let q = supabase.from('employees').select('id, nom, prenom, initiale, email').order('nom');
    if (ids.length > 0) q = q.not('id', 'in', `(${ids.map(id => `'${id}'`).join(',')})`);
    if (searchTerm) q = q.or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%`);
    const { data } = await q;
    if (data) setProfesseursDisponibles(data);
  };

  // ── Mise à jour régime ────────────────────────────────────────────────────

  const updateRegimeEleve = async (matricule: number, regime: RegimeAlimentaire) => {
    await supabase.from('students').update({ regime_alimentaire: regime }).eq('matricule', matricule);
    setParticipants(prev => prev.map(p =>
      p.eleve.matricule === matricule ? { ...p, eleve: { ...p.eleve, regime_alimentaire: regime } } : p
    ));
  };

  const updateRegimeProf = async (employeeId: string, regime: RegimeAlimentaire) => {
    await supabase.from('employees').update({ regime_alimentaire: regime }).eq('id', employeeId);
    setProfesseursParticipants(prev => prev.map(p =>
      p.professeur_id === employeeId ? { ...p, professeur: { ...p.professeur, regime_alimentaire: regime } } : p
    ));
  };

  const saveSelfProf = async () => {
    const payload: Record<string, string | null> = {
      date_naissance: selfDraft.date_naissance || null,
      nationalite: selfDraft.nationalite || null,
    };
    await supabase.from('employees').update(payload).eq('id', userId);
    setProfesseursParticipants(prev => prev.map(p =>
      p.professeur_id === userId
        ? { ...p, professeur: { ...p.professeur, ...payload } }
        : p
    ));
    setEditingSelfProf(false);
  };

  // ── Autres actions ────────────────────────────────────────────────────────

  const addParticipants = async () => {
    if (addMode === 'prof') {
      if (selectedProfesseurs.size === 0) { alert('Sélectionnez au moins un professeur'); return; }
      const { error } = await supabase.from('voyage_professeurs').insert(
        Array.from(selectedProfesseurs).map(id => ({ voyage_id: voyageId, professeur_id: id, role: selectedProfRole }))
      );
      if (!error) { loadProfesseursParticipants(); setShowAddModal(false); setSelectedProfesseurs(new Set()); }
    } else {
      let elevesAAjouter: Eleve[] = [];
      if (addMode === 'individuel' && selectedEleves.size > 0)
        elevesAAjouter = elevesDisponibles.filter(e => selectedEleves.has(e.matricule));
      else if (addMode === 'classe' && selectedClasse) {
        const { data } = await supabase.from('students').select('*').eq('classe', selectedClasse)
          .not('matricule', 'in', `(${participants.map(p => p.eleve_id).join(',')})`);
        elevesAAjouter = data || [];
      } else if (addMode === 'niveau' && selectedNiveau !== '') {
        const { data } = await supabase.from('students').select('*').eq('niveau', selectedNiveau)
          .not('matricule', 'in', `(${participants.map(p => p.eleve_id).join(',')})`);
        elevesAAjouter = data || [];
      }
      if (elevesAAjouter.length === 0) { alert('Aucun élève à ajouter'); return; }
      const { error } = await supabase.from('voyage_participants').insert(
        elevesAAjouter.map(e => ({ voyage_id: voyageId, eleve_id: e.matricule, genre: e.sexe, classe: e.classe, statut: 'confirme' }))
      );
      if (!error) { loadParticipants(); setShowAddModal(false); setSelectedEleves(new Set()); }
    }
  };

  const removeParticipant = async (p: ParticipantUnion) => {
    if ('type' in p && p.type === 'professeur') {
      if (confirm('Retirer ce professeur du voyage ?')) {
        const { error } = await supabase.from('voyage_professeurs').delete().eq('id', p.id);
        if (!error) loadProfesseursParticipants();
      }
    } else {
      if (confirm('Retirer cet élève du voyage ?')) {
        const { error } = await supabase.from('voyage_participants').delete().eq('id', p.id);
        if (!error) loadParticipants();
      }
    }
  };

  const removeMultipleParticipants = async () => {
    const classes = Array.from(new Set(participants.map(p => p.classe))).sort();
    const c = prompt(`Entrez la classe à retirer:\nClasses: ${classes.join(', ')}`);
    if (c && classes.includes(c)) {
      const toRemove = participants.filter(p => p.classe === c);
      if (confirm(`Retirer les ${toRemove.length} élèves de la classe ${c} ?`)) {
        const { error } = await supabase.from('voyage_participants').delete().in('id', toRemove.map(p => p.id));
        if (!error) loadParticipants();
      }
    } else if (c) alert('Classe non trouvée');
  };

  const updateStatut = async (id: string, statut: string) => {
    const { error } = await supabase.from('voyage_participants').update({ statut }).eq('id', id);
    if (!error) loadParticipants();
  };

  const updateStatutMultiple = async (statut: string) => {
    const classes = Array.from(new Set(participants.map(p => p.classe))).sort();
    const c = prompt(`Classe à mettre à jour (${statut}):\nClasses: ${classes.join(', ')}`);
    if (c && classes.includes(c)) {
      const toUpdate = participants.filter(p => p.classe === c);
      if (confirm(`Mettre à jour les ${toUpdate.length} élèves de ${c} ?`)) {
        const { error } = await supabase.from('voyage_participants').update({ statut }).in('id', toUpdate.map(p => p.id));
        if (!error) loadParticipants();
      }
    } else if (c) alert('Classe non trouvée');
  };

  const updateProfRole = async (id: string, role: string) => {
    const { error } = await supabase.from('voyage_professeurs').update({ role }).eq('id', id);
    if (!error) loadProfesseursParticipants();
  };

  const toggleSelectEleve = (m: number) => {
    const s = new Set(selectedEleves); s.has(m) ? s.delete(m) : s.add(m); setSelectedEleves(s);
  };
  const toggleSelectProfesseur = (id: string) => {
    const s = new Set(selectedProfesseurs); s.has(id) ? s.delete(id) : s.add(id); setSelectedProfesseurs(s);
  };
  const toggleSelectAllEleves = () => setSelectedEleves(
    selectedEleves.size === elevesDisponibles.length ? new Set() : new Set(elevesDisponibles.map(e => e.matricule))
  );
  const toggleSelectAllProfesseurs = () => setSelectedProfesseurs(
    selectedProfesseurs.size === professeursDisponibles.length ? new Set() : new Set(professeursDisponibles.map(p => p.id))
  );

  // ── Grid columns dynamiques ───────────────────────────────────────────────

  const colsEleve = isResponsable
    ? '3fr 2fr 1.5fr 1.5fr 2fr 1.5fr 2fr 1fr'
    : isEmployee
    ? '4fr 2fr 1.5fr 2fr 2fr 1fr'
    : '5fr 2fr 1.5fr 2fr 1fr';

  const colsProf = isResponsable && isEmployee
    ? '3fr 2fr 2fr 2fr 1.5fr 2fr 1fr'   // + date_naiss + nationalite + regime
    : isResponsable
    ? '3fr 2fr 2fr 1.5fr 1fr'            // + date_naiss + nationalite
    : isEmployee
    ? '3fr 2fr 2fr 1fr'                  // + regime
    : '4fr 3fr 1fr';

  const classesParticipants = Array.from(new Set(participants.map(p => p.classe))).sort();
  const niveaux = [1, 2, 3, 4, 5, 6];
  const participantsTries = trierParticipants(participants);
  const elevesConfirmes = participants.filter(p => p.statut === 'confirme').length;
  const total = elevesConfirmes + professeursParticipants.length;

  if (loading) return <div className="text-center py-8">Chargement des participants...</div>;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <p className="text-gray-600 mt-1">
            {total} participant{total > 1 ? 's' : ''} ({elevesConfirmes} élève{elevesConfirmes > 1 ? 's' : ''} confirmé{elevesConfirmes > 1 ? 's' : ''}, {professeursParticipants.length} professeur{professeursParticipants.length > 1 ? 's' : ''})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEmployee && (
            <button onClick={() => setShowExportModal(true)}
              className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50">
              ⬇ Exporter Excel
            </button>
          )}
          {canEdit && (
            <>
              <button onClick={removeMultipleParticipants} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Retirer une classe</button>
              <button onClick={() => updateStatutMultiple('liste_attente')} className="px-4 py-2 border border-yellow-300 text-yellow-600 rounded-lg hover:bg-yellow-50">Mettre en liste d'attente</button>
              <button onClick={() => { setAddMode('prof'); setShowAddModal(true); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">+ Ajouter des professeurs</button>
              <button onClick={() => { setAddMode('individuel'); setShowAddModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Ajouter des élèves</button>
            </>
          )}
        </div>
      </div>

      {userType === 'student' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">👋 Voici la liste des participants. Consultation uniquement.</p>
        </div>
      )}

      {/* Filtre */}
      <div className="flex gap-4">
        <select value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Toutes les classes</option>
          {classesParticipants.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Professeurs */}

      {/* Encart "Mes informations" — visible pour tous les employees participants */}
      {isEmployee && (() => {
        const selfProf = professeursParticipants.find(p => p.professeur_id === userId);
        if (!selfProf) return null;
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-800">👤 Mes informations personnelles</h3>
              {!editingSelfProf ? (
                <button
                  onClick={() => {
                    setSelfDraft({
                      date_naissance: selfProf.professeur.date_naissance?.split('T')[0] ?? '',
                      nationalite: selfProf.professeur.nationalite ?? '',
                    });
                    setEditingSelfProf(true);
                  }}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  ✎ Modifier
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveSelfProf} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">✓ Enregistrer</button>
                  <button onClick={() => setEditingSelfProf(false)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">Annuler</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Date de naissance</p>
                {editingSelfProf ? (
                  <input
                    type="date"
                    value={selfDraft.date_naissance}
                    onChange={e => setSelfDraft(d => ({ ...d, date_naissance: e.target.value }))}
                    className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                ) : (
                  <p className="text-sm text-gray-700">
                    {selfProf.professeur.date_naissance
                      ? new Date(selfProf.professeur.date_naissance).toLocaleDateString('fr-BE')
                      : <span className="text-gray-400 italic">Non renseignée</span>}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Nationalité</p>
                {editingSelfProf ? (
                  <input
                    type="text"
                    value={selfDraft.nationalite}
                    onChange={e => setSelfDraft(d => ({ ...d, nationalite: e.target.value }))}
                    placeholder="ex : Belge"
                    className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                ) : (
                  <p className="text-sm text-gray-700">
                    {selfProf.professeur.nationalite || <span className="text-gray-400 italic">Non renseignée</span>}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Régime alimentaire</p>
                <RegimeCell
                  regime={parseRegime(selfProf.professeur.regime_alimentaire)}
                  canEdit={true}
                  onUpdate={r => updateRegimeProf(userId, r)}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {professeursParticipants.length > 0 && (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <div className="grid gap-4 p-4 bg-purple-50 font-medium text-sm text-gray-700 border-b"
            style={{ gridTemplateColumns: colsProf }}>
            <div>Professeur</div>
            <div>Rôle</div>
            {isResponsable && <><div>Date naiss.</div><div>Nationalité</div></>}
            {isEmployee && <div>Régime alimentaire</div>}
            <div />
          </div>
          {professeursParticipants.map(prof => {
            const isSelf = prof.professeur_id === userId;
            return (
            <div key={prof.id} className={`grid gap-4 p-4 border-b hover:bg-gray-50 items-center ${isSelf ? 'bg-blue-50' : ''}`}
              style={{ gridTemplateColumns: colsProf }}>
              <div className="font-medium flex items-center gap-2">
                {prof.professeur.prenom} {prof.professeur.nom}
                {isSelf && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">vous</span>}
              </div>
              <div>
                {canEdit ? (
                  <select value={prof.role} onChange={e => updateProfRole(prof.id, e.target.value)} className="text-sm border rounded px-2 py-1">
                    <option value="accompagnateur">👥 Accompagnateur</option>
                    <option value="responsable">⭐ Responsable</option>
                    <option value="direction">🏢 Direction</option>
                    <option value="infirmier">🏥 Infirmier</option>
                  </select>
                ) : (
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    prof.role === 'responsable' ? 'bg-yellow-100 text-yellow-800' :
                    prof.role === 'direction' ? 'bg-blue-100 text-blue-800' :
                    prof.role === 'infirmier' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {prof.role === 'accompagnateur' ? '👥 Accompagnateur' :
                     prof.role === 'responsable' ? '⭐ Responsable' :
                     prof.role === 'direction' ? '🏢 Direction' :
                     prof.role === 'infirmier' ? '🏥 Infirmier' : prof.role}
                  </span>
                )}
              </div>
              {isResponsable && (
                <>
                  {/* Date de naissance — éditable uniquement sur sa propre ligne */}
                  <div className="text-sm text-gray-600">
                    {isSelf && editingSelfProf ? (
                      <input
                        type="date"
                        value={selfDraft.date_naissance}
                        onChange={e => setSelfDraft(d => ({ ...d, date_naissance: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <span>
                        {prof.professeur.date_naissance
                          ? new Date(prof.professeur.date_naissance).toLocaleDateString('fr-BE')
                          : '–'}
                      </span>
                    )}
                  </div>
                  {/* Nationalité — éditable uniquement sur sa propre ligne */}
                  <div className="text-sm text-gray-600">
                    {isSelf && editingSelfProf ? (
                      <input
                        type="text"
                        value={selfDraft.nationalite}
                        onChange={e => setSelfDraft(d => ({ ...d, nationalite: e.target.value }))}
                        placeholder="ex : Belge"
                        className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-full"
                      />
                    ) : (
                      <span>{prof.professeur.nationalite ?? '–'}</span>
                    )}
                  </div>
                </>
              )}
              {isEmployee && (
                <RegimeCell
                  regime={parseRegime(prof.professeur.regime_alimentaire)}
                  canEdit={isEmployee}
                  onUpdate={r => updateRegimeProf(prof.professeur_id, r)}
                />
              )}
              <div className="flex justify-end gap-2">
                {/* Bouton édition infos perso — visible uniquement sur sa propre ligne */}
                {isSelf && isResponsable && !editingSelfProf && (
                  <button
                    onClick={() => {
                      setSelfDraft({
                        date_naissance: prof.professeur.date_naissance?.split('T')[0] ?? '',
                        nationalite: prof.professeur.nationalite ?? '',
                      });
                      setEditingSelfProf(true);
                    }}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                    title="Modifier mes infos"
                  >
                    ✎
                  </button>
                )}
                {isSelf && editingSelfProf && (
                  <>
                    <button onClick={saveSelfProf} className="text-green-600 hover:text-green-800 text-xs font-medium">✓</button>
                    <button onClick={() => setEditingSelfProf(false)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  </>
                )}
                {canEdit && (
                  <button onClick={() => removeParticipant(prof as any)} className="text-red-500 hover:text-red-700 text-sm">Retirer</button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Élèves */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <div className="grid gap-4 p-4 bg-gray-50 font-medium text-sm text-gray-700 border-b"
          style={{ gridTemplateColumns: colsEleve }}>
          <div>Élève</div>
          <div>Classe</div>
          <div>Genre</div>
          <div>Statut</div>
          {isResponsable && <><div>Date naiss.</div><div>Nationalité</div></>}
          {isEmployee && <div>Régime</div>}
          <div />
        </div>

        {participantsTries
          .filter(p => !selectedClasse || p.classe === selectedClasse)
          .map((p, idx, arr) => {
            const showDivider = idx > 0 && arr[idx - 1].statut !== p.statut;
            return (
              <div key={p.id}>
                {showDivider && <div className="border-t-2 border-gray-300" />}
                <div
                  className={`grid gap-4 p-4 border-b hover:bg-gray-50 items-center ${
                    p.statut === 'annule' ? 'opacity-50' :
                    p.statut === 'liste_attente' ? 'bg-yellow-50' : ''
                  }`}
                  style={{ gridTemplateColumns: colsEleve }}
                >
                  <div className="font-medium">{p.eleve.nom} {p.eleve.prenom}</div>
                  <div className="text-gray-600">{p.classe}</div>
                  <div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      p.genre === 'M' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}>{p.genre === 'M' ? 'Garçon' : 'Fille'}</span>
                  </div>
                  <div>
                    {canEdit ? (
                      <select value={p.statut} onChange={e => updateStatut(p.id, e.target.value)} className="text-sm border rounded px-2 py-1">
                        <option value="confirme">✅ Confirmé</option>
                        <option value="liste_attente">⏳ Liste d'attente</option>
                        <option value="annule">❌ Annulé</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        p.statut === 'confirme' ? 'bg-green-100 text-green-800' :
                        p.statut === 'liste_attente' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {p.statut === 'confirme' ? '✅ Confirmé' :
                         p.statut === 'liste_attente' ? "⏳ Liste d'attente" : '❌ Annulé'}
                      </span>
                    )}
                  </div>
                  {isResponsable && (
                    <>
                      <div className="text-sm text-gray-600">
                        {p.eleve.date_naissance ? new Date(p.eleve.date_naissance).toLocaleDateString('fr-BE') : '–'}
                      </div>
                      <div className="text-sm text-gray-600">{p.eleve.nationalite ?? '–'}</div>
                    </>
                  )}
                  {isEmployee && (
                    <RegimeCell
                      regime={parseRegime(p.eleve.regime_alimentaire)}
                      canEdit={canEdit}
                      onUpdate={r => updateRegimeEleve(p.eleve.matricule, r)}
                    />
                  )}
                  <div className="flex justify-end">
                    {canEdit && (
                      <button onClick={() => removeParticipant(p as any)} className="text-red-500 hover:text-red-700 text-sm">Retirer</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal export */}
      {showExportModal && (
        <ModalExport participants={participants} professeursParticipants={professeursParticipants}
          isResponsable={isResponsable} isEmployee={isEmployee} onClose={() => setShowExportModal(false)} />
      )}

      {/* Modal ajout */}
      {canEdit && showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{addMode === 'prof' ? 'Ajouter des professeurs' : 'Ajouter des élèves'}</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              {addMode !== 'prof' && (
                <div className="mt-4 flex gap-4 border-b pb-4">
                  {(['individuel', 'classe', 'niveau'] as const).map(mode => (
                    <button key={mode} onClick={() => { setAddMode(mode); setSelectedClasse(''); setSelectedNiveau(''); }}
                      className={`px-4 py-2 rounded-lg ${addMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {mode === 'individuel' ? 'Ajout individuel' : mode === 'classe' ? 'Ajouter une classe' : 'Ajouter un niveau'}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-4">
                {addMode === 'prof' ? (
                  <>
                    <input type="text" placeholder="Rechercher un professeur..." value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg" autoFocus />
                    <select value={selectedProfRole} onChange={e => setSelectedProfRole(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
                      <option value="accompagnateur">👥 Accompagnateur</option>
                      <option value="responsable">⭐ Responsable</option>
                      <option value="direction">🏢 Direction</option>
                      <option value="infirmier">🏥 Infirmier</option>
                    </select>
                  </>
                ) : (
                  <>
                    {addMode === 'individuel' && (
                      <input type="text" placeholder="Rechercher un élève..." value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg" autoFocus />
                    )}
                    {addMode === 'classe' && (
                      <select value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)} className="w-full px-4 py-2 border rounded-lg" autoFocus>
                        <option value="">Choisir une classe...</option>
                        {loadingClasses ? <option disabled>Chargement...</option> :
                          classesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                    {addMode === 'niveau' && (
                      <select value={selectedNiveau} onChange={e => setSelectedNiveau(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-2 border rounded-lg" autoFocus>
                        <option value="">Choisir un niveau...</option>
                        {niveaux.map(n => <option key={n} value={n}>Niveau {n}</option>)}
                      </select>
                    )}
                  </>
                )}
                {addMode === 'prof' && professeursDisponibles.length > 0 && (
                  <p className="text-sm text-gray-600">{professeursDisponibles.length} professeur(s) disponible(s)</p>
                )}
                {addMode !== 'prof' && elevesDisponibles.length > 0 && (
                  <p className="text-sm text-gray-600">{elevesDisponibles.length} élève(s) trouvé(s)</p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {addMode === 'prof' ? (
                <>
                  {professeursDisponibles.length > 0 && (
                    <div className="mb-4 flex items-center gap-2">
                      <input type="checkbox"
                        checked={selectedProfesseurs.size === professeursDisponibles.length && professeursDisponibles.length > 0}
                        onChange={toggleSelectAllProfesseurs} className="rounded" />
                      <span className="text-sm text-gray-600">
                        {selectedProfesseurs.size === 0 ? 'Sélectionner tous' : `${selectedProfesseurs.size} sélectionné(s)`}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {professeursDisponibles.map(prof => (
                      <div key={prof.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                        <input type="checkbox" checked={selectedProfesseurs.has(prof.id)} onChange={() => toggleSelectProfesseur(prof.id)} className="rounded" />
                        <div className="flex-1">
                          <div className="font-medium">{prof.prenom} {prof.nom}</div>
                          <div className="text-sm text-gray-600">{prof.email || '—'} • {prof.initiale}</div>
                        </div>
                      </div>
                    ))}
                    {professeursDisponibles.length === 0 && searchTerm && (
                      <p className="text-center py-8 text-gray-500">Aucun professeur trouvé</p>
                    )}
                  </div>
                  {selectedProfesseurs.size > 0 && (
                    <button onClick={addParticipants} className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Ajouter {selectedProfesseurs.size} professeur(s) avec le rôle "{selectedProfRole}"
                    </button>
                  )}
                </>
              ) : addMode === 'individuel' ? (
                <>
                  {elevesDisponibles.length > 0 && (
                    <div className="mb-4 flex items-center gap-2">
                      <input type="checkbox"
                        checked={selectedEleves.size === elevesDisponibles.length && elevesDisponibles.length > 0}
                        onChange={toggleSelectAllEleves} className="rounded" />
                      <span className="text-sm text-gray-600">
                        {selectedEleves.size === 0 ? 'Sélectionner tous' : `${selectedEleves.size} sélectionné(s)`}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {elevesDisponibles.map(e => (
                      <div key={e.matricule} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                        <input type="checkbox" checked={selectedEleves.has(e.matricule)} onChange={() => toggleSelectEleve(e.matricule)} className="rounded" />
                        <div className="flex-1">
                          <div className="font-medium">{e.nom} {e.prenom}</div>
                          <div className="text-sm text-gray-600">{e.classe} • Niveau {e.niveau} • {e.sexe === 'M' ? 'Garçon' : 'Fille'}</div>
                        </div>
                      </div>
                    ))}
                    {elevesDisponibles.length === 0 && searchTerm && (
                      <p className="text-center py-8 text-gray-500">Aucun élève trouvé</p>
                    )}
                  </div>
                  {selectedEleves.size > 0 && (
                    <button onClick={addParticipants} className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Ajouter {selectedEleves.size} élève(s)
                    </button>
                  )}
                </>
              ) : (
                <>
                  {elevesDisponibles.length > 0 && (
                    <div>
                      <p className="mb-4 text-gray-600">{elevesDisponibles.length} élève(s) vont être ajoutés</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                        {elevesDisponibles.slice(0, 20).map(e => (
                          <div key={e.matricule} className="p-2 border rounded">
                            <span className="font-medium">{e.nom} {e.prenom}</span>
                            <span className="text-sm text-gray-600 ml-2">({e.classe} - Niveau {e.niveau})</span>
                          </div>
                        ))}
                        {elevesDisponibles.length > 20 && (
                          <p className="text-sm text-gray-500 mt-2">et {elevesDisponibles.length - 20} autre(s)...</p>
                        )}
                      </div>
                      <button onClick={addParticipants} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Ajouter {addMode === 'classe' ? 'cette classe' : 'ce niveau'} ({elevesDisponibles.length} élèves)
                      </button>
                    </div>
                  )}
                  {elevesDisponibles.length === 0 && (selectedClasse || selectedNiveau !== '') && (
                    <div className="text-center py-8 text-gray-500">
                      Aucun élève disponible<br /><span className="text-sm">(peut-être déjà tous inscrits ?)</span>
                    </div>
                  )}
                  {elevesDisponibles.length === 0 && !selectedClasse && selectedNiveau === '' && (
                    <p className="text-center py-8 text-gray-400">
                      Sélectionnez {addMode === 'classe' ? 'une classe' : 'un niveau'} pour voir les élèves disponibles
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}