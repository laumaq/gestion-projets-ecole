// components/voyages/ParticipantsList.tsx

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
  telephone_eleve?: string;
  telephone_parent?: string;
}

interface Professeur {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  email: string | null;
  telephone?: string;
  eleve_voir_telephone?: boolean;
  date_naissance?: string | null;
  nationalite?: string | null;
  regime_alimentaire?: any;
}

interface Participant {
  id: string;
  eleve_id: number;
  participe: boolean;
  genre: string;
  classe: string;
  type: 'eleve';
  eleve: Eleve;
  // Champs administratifs (pour le calcul de complétude)
  passport_requis?: boolean;
  visa_requis?: boolean;
  passport_numero?: string | null;
  passport_verifie?: boolean;
  visa_numero?: string | null;
  visa_verifie?: boolean;
  fiche_medicale_url?: string | null;
  fiche_medicale_verifiee?: boolean;
  carte_mutuelle_url?: string | null;
  carte_mutuelle_verifiee?: boolean;
  carte_identite_url?: string | null;
  carte_identite_verifiee?: boolean;
  montant_paye?: number;
}

interface ProfesseurParticipant {
  id: string;
  professeur_id: string;
  role: string;
  type: 'professeur';
  professeur: Professeur;
}

type ParticipantUnion = Participant | ProfesseurParticipant;

// ── Config du voyage ──────────────────────────────────────────────────────────

interface VoyageConfig {
  passport_requis: boolean;
  visa_requis: boolean;
  montant_attendu_defaut: number | null;
  eleve_peut_modifier_telephone: boolean;
  eleve_peut_modifier_regime: boolean;
}

// ── Complétude ────────────────────────────────────────────────────────────────

function estComplet(p: Participant, config: VoyageConfig): boolean {
  if (!p.participe) return false;
  if (config.passport_requis && (!p.passport_numero || !p.passport_verifie)) return false;
  if (config.visa_requis && (!p.visa_numero || !p.visa_verifie)) return false;
  if (!p.fiche_medicale_url || !p.fiche_medicale_verifiee) return false;
  if (!p.carte_mutuelle_url || !p.carte_mutuelle_verifiee) return false;
  if (!p.carte_identite_url || !p.carte_identite_verifiee) return false;
  if (config.montant_attendu_defaut != null) {
    if ((p.montant_paye || 0) < config.montant_attendu_defaut) return false;
  }
  return true;
}

function trierParticipants(list: Participant[], config: VoyageConfig): Participant[] {
  return [...list].sort((a, b) => {
    const aComplet = estComplet(a, config);
    const bComplet = estComplet(b, config);
    if (aComplet !== bComplet) return aComplet ? -1 : 1;
    const classeA = a.classe || '';
    const classeB = b.classe || '';
    if (classeA !== classeB) return classeA.localeCompare(classeB);
    const nomA = a.eleve?.nom || '';
    const nomB = b.eleve?.nom || '';
    if (nomA !== nomB) return nomA.localeCompare(nomB);
    return (a.eleve?.prenom || '').localeCompare(b.eleve?.prenom || '');
  });
}

// ── Modal export ──────────────────────────────────────────────────────────────

interface ExportConfig {
  colonnes: {
    nom: boolean; prenom: boolean; classe: boolean; genre: boolean; complet: boolean;
    date_naissance: boolean; nationalite: boolean; regime: boolean; notes_regime: boolean;
  };
  inclure_profs: boolean;
  colonne_type: boolean;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
}

function ModalExport({ participants, professeursParticipants, config, isResponsable, isEmployee, onClose }: {
  participants: Participant[];
  professeursParticipants: ProfesseurParticipant[];
  config: VoyageConfig;
  isResponsable: boolean;
  isEmployee: boolean;
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<ExportConfig>({
    colonnes: {
      nom: true, prenom: true, classe: true, genre: true, complet: isResponsable,
      date_naissance: isResponsable, nationalite: isResponsable,
      regime: isEmployee, notes_regime: isEmployee,
    },
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
    switch (cfg.dateFormat) {
      case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
      case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
      default:           return `${dd}/${mm}/${yyyy}`;
    }
  };

  const toggleCol = (k: keyof ExportConfig['colonnes']) =>
    setCfg(c => ({ ...c, colonnes: { ...c.colonnes, [k]: !c.colonnes[k] } }));

  const GLABELS: Record<string, string> = { M: 'Garçon', G: 'Garçon', F: 'Fille' };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const c = cfg.colonnes;

    const header: string[] = [];
    if (cfg.inclure_profs && cfg.colonne_type) header.push('Type');
    if (c.nom) header.push('Nom');
    if (c.prenom) header.push('Prénom');
    if (c.classe) header.push('Classe / Rôle');
    if (c.genre) header.push('Genre');
    if (c.complet) header.push('État');
    if (c.date_naissance) header.push('Date de naissance');
    if (c.nationalite) header.push('Nationalité');
    if (c.regime) header.push('Régime alimentaire');
    if (c.notes_regime) header.push('Allergies / notes régime');

    const rows: (string | null)[][] = [];

    const elevesFiltered = trierParticipants(participants.filter(p => p.participe), config);

    elevesFiltered.forEach(p => {
      const r = parseRegime(p.eleve.regime_alimentaire);
      const row: (string | null)[] = [];
      if (cfg.inclure_profs && cfg.colonne_type) row.push('Élève');
      if (c.nom) row.push(p.eleve.nom);
      if (c.prenom) row.push(p.eleve.prenom);
      if (c.classe) row.push(p.classe);
      if (c.genre) row.push(GLABELS[p.genre] ?? p.genre);
      if (c.complet) row.push(estComplet(p, config) ? 'Complet' : 'Incomplet');
      if (c.date_naissance) row.push(formatDate(p.eleve.date_naissance));
      if (c.nationalite) row.push(p.eleve.nationalite ?? '');
      if (c.regime) row.push(r.regime);
      if (c.notes_regime) row.push(r.notes);
      rows.push(row);
    });

    if (cfg.inclure_profs) {
      [...professeursParticipants]
        .sort((a, b) => a.professeur.nom.localeCompare(b.professeur.nom))
        .forEach(p => {
          const r = parseRegime(p.professeur.regime_alimentaire);
          const row: (string | null)[] = [];
          if (cfg.colonne_type) row.push('Professeur');
          if (c.nom) row.push(p.professeur.nom);
          if (c.prenom) row.push(p.professeur.prenom);
          if (c.classe) row.push(p.role);
          if (c.genre) row.push('');
          if (c.complet) row.push('');
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

  const nbEleves = participants.filter(p => p.participe).length;
  const nbTotal = nbEleves + (cfg.inclure_profs ? professeursParticipants.length : 0);

  const COLS: [keyof ExportConfig['colonnes'], string, boolean][] = [
    ['nom', 'Nom', true], ['prenom', 'Prénom', true],
    ['classe', 'Classe / Rôle', true], ['genre', 'Genre', true],
    ['complet', 'État (complet/incomplet)', isResponsable],
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
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Colonnes</p>
            <div className="grid grid-cols-2 gap-2">
              {COLS.filter(([, , v]) => v).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={cfg.colonnes[k]} onChange={() => toggleCol(k)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {professeursParticipants.length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={cfg.inclure_profs}
                  onChange={() => setCfg(c => ({ ...c, inclure_profs: !c.inclure_profs }))} className="rounded" />
                Inclure les professeurs ({professeursParticipants.length}) après les élèves
              </label>
              {cfg.inclure_profs && (
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 ml-6">
                  <input type="checkbox" checked={cfg.colonne_type}
                    onChange={() => setCfg(c => ({ ...c, colonne_type: !c.colonne_type }))} className="rounded" />
                  Ajouter une colonne "Type" (Élève / Professeur)
                </label>
              )}
            </div>
          )}

          {cfg.colonnes.date_naissance && (
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
                      checked={cfg.dateFormat === fmt}
                      onChange={() => setCfg(c => ({ ...c, dateFormat: fmt }))}
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
            {cfg.inclure_profs && professeursParticipants.length > 0
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
  const [editingEleve, setEditingEleve] = useState<Eleve | null>(null);
  const [editingEmploye, setEditingEmploye] = useState<Professeur | null>(null);
  const [expandedTableEleves, setExpandedTableEleves] = useState(false);
  const [expandedTableProfs, setExpandedTableProfs] = useState(false);
  const [editingEleveSelf, setEditingEleveSelf] = useState(false);
  const [selfEleveData, setSelfEleveData] = useState({
    telephone_eleve: '',
    telephone_parent: '',
    regime_alimentaire: null as any,
  });
  const [currentUserEleveId, setCurrentUserEleveId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filtreRegime, setFiltreRegime] = useState<string>('all');

  const [config, setConfig] = useState<VoyageConfig>({
    passport_requis: false,
    visa_requis: false,
    montant_attendu_defaut: null,
    eleve_peut_modifier_telephone: false,
    eleve_peut_modifier_regime: false,
  });

  const canEdit = userType === 'employee' && isResponsable;
  const isEmployee = userType === 'employee';
  const isEleve = userType === 'student';

  useEffect(() => {
    const type = localStorage.getItem('userType');
    const id = localStorage.getItem('userId');
    setCurrentUserId(id);
    if (type === 'student' && id) setCurrentUserEleveId(parseInt(id));
  }, []);

  useEffect(() => {
    loadVoyageConfig();
    loadParticipants();
    loadProfesseursParticipants();
  }, [voyageId]);

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

  const loadVoyageConfig = async () => {
    const { data } = await supabase
      .from('voyages')
      .select('passport_requis, visa_requis, montant_attendu_defaut, eleve_peut_modifier_telephone, eleve_peut_modifier_regime')
      .eq('id', voyageId)
      .single();

    if (data) setConfig(data);
  };

  const updateElevePeutModifierTelephone = async (value: boolean) => {
    const { error } = await supabase
      .from('voyages')
      .update({ eleve_peut_modifier_telephone: value })
      .eq('id', voyageId);
    if (!error) setConfig({ ...config, eleve_peut_modifier_telephone: value });
  };

  const updateElevePeutModifierRegime = async (value: boolean) => {
    const { error } = await supabase
      .from('voyages')
      .update({ eleve_peut_modifier_regime: value })
      .eq('id', voyageId);
    if (!error) setConfig({ ...config, eleve_peut_modifier_regime: value });
  };

  const loadClassesDisponibles = async () => {
    setLoadingClasses(true);
    const { data } = await supabase.from('students').select('classe').order('classe');
    if (data) setClassesDisponibles(Array.from(new Set(data.map((i: any) => i.classe))).sort());
    setLoadingClasses(false);
  };

  const loadParticipants = async () => {
    // 1. Charger les participants
    const { data, error } = await supabase
      .from('voyage_participants')
      .select(`*, eleve:students!inner(
        matricule, nom, prenom, classe, niveau, sexe,
        date_naissance, nationalite, regime_alimentaire,
        telephone_eleve, telephone_parent
      )`)
      .eq('voyage_id', voyageId)
      .eq('participe', true);

    if (error || !data) {
      setParticipants([]);
      return;
    }

    // 2. Charger les paiements pour calculer le montant payé
    const participantIds = data.map((p: any) => p.id);
    let paiements: any[] = [];
    if (participantIds.length > 0) {
      const { data: paiementsData } = await supabase
        .from('voyage_paiements')
        .select('voyage_participant_id, montant')
        .in('voyage_participant_id', participantIds);
      paiements = paiementsData || [];
    }

    const totalParParticipant = new Map<string, number>();
    paiements.forEach((p: any) => {
      const current = totalParParticipant.get(p.voyage_participant_id) || 0;
      totalParParticipant.set(p.voyage_participant_id, current + Number(p.montant));
    });

    // 3. Fusionner
    const enriched: Participant[] = data.map((p: any) => ({
      ...p,
      eleve: Array.isArray(p.eleve) ? p.eleve[0] : p.eleve,
      montant_paye: totalParParticipant.get(p.id) || 0,
    }));

    setParticipants(enriched);
    setLoading(false);
  };

  const loadProfesseursParticipants = async () => {
    const res = await supabase
      .from('voyage_professeurs')
      .select(`*, professeur:employees(
        id, nom, prenom, initiale, email, date_naissance, nationalite, regime_alimentaire,
        telephone, eleve_voir_telephone
      )`)
      .eq('voyage_id', voyageId);

    if (!res.error && res.data) {
      setProfesseursParticipants(res.data.map((i: any) => ({ ...i, type: 'professeur', professeur: i.professeur })));
    }
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

  // ── Régime ────────────────────────────────────────────────────────────────

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

  // ── Actions ───────────────────────────────────────────────────────────────

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
        elevesAAjouter.map(e => ({
          voyage_id: voyageId,
          eleve_id: e.matricule,
          genre: e.sexe,
          classe: e.classe,
          participe: true,
        }))
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

  const updateProfRole = async (id: string, role: string) => {
    const { error } = await supabase.from('voyage_professeurs').update({ role }).eq('id', id);
    if (!error) loadProfesseursParticipants();
  };

  const updateEleveInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEleve) return;

    const formData = new FormData(e.currentTarget);
    const updateData: any = {
      telephone_eleve: formData.get('telephone_eleve') || null,
      telephone_parent: formData.get('telephone_parent') || null,
    };

    const { error } = await supabase
      .from('students')
      .update(updateData)
      .eq('matricule', editingEleve.matricule);

    if (!error) {
      setEditingEleve(null);
      loadParticipants();
    }
  };

  const updateEmployeInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEmploye) return;

    const formData = new FormData(e.currentTarget);
    const regimeData = {
      regime: formData.get('regime') || 'Omnivore',
      notes: formData.get('regime_notes') || '',
    };

    const updateData: any = {
      email: formData.get('email') || null,
      telephone: formData.get('telephone') || null,
      eleve_voir_telephone: formData.get('eleve_voir_telephone') === 'on',
      date_naissance: formData.get('date_naissance') || null,
      nationalite: formData.get('nationalite') || null,
      regime_alimentaire: regimeData,
    };

    const { error } = await supabase.from('employees').update(updateData).eq('id', editingEmploye.id);

    if (!error) {
      setEditingEmploye(null);
      loadProfesseursParticipants();
    } else {
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const updateSelfEleveInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const formData = new FormData(e.currentTarget);
    const updateData: any = {};

    if (config.eleve_peut_modifier_telephone) {
      updateData.telephone_eleve = formData.get('telephone_eleve') || null;
      updateData.telephone_parent = formData.get('telephone_parent') || null;
    }
    if (config.eleve_peut_modifier_regime) {
      updateData.regime_alimentaire = {
        regime: formData.get('regime') || 'Omnivore',
        notes: formData.get('regime_notes') || '',
      };
    }

    const { error } = await supabase.from('students').update(updateData).eq('matricule', parseInt(userId));

    if (!error) {
      setEditingEleveSelf(false);
      loadParticipants();
    }
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

  // ── Colonnes ──────────────────────────────────────────────────────────────

  // Colonnes élève : élève | classe | genre | état | (date naiss | nationalité) | (régime) | (tél élève | tél parent) | actions
  const colsEleve = (() => {
    const parts = ['3fr', '1.5fr', '1.2fr', '0.8fr'];
    if (isResponsable) parts.push('2fr', '2fr');
    if (isEmployee) parts.push('2.5fr', '2fr', '2fr');
    parts.push('1fr');
    return parts.join(' ');
  })();

  // Colonnes prof : prof | rôle | (date naiss | nationalité) | (régime) | téléphone | actions
  const colsProf = (() => {
    const parts = ['3fr', '2fr'];
    if (isResponsable) parts.push('2fr', '2fr');
    if (isEmployee) parts.push('2.5fr');
    parts.push('2fr', '1fr');
    return parts.join(' ');
  })();

  const classesParticipants = Array.from(new Set(participants.map(p => p.classe))).sort();
  const niveaux = [1, 2, 3, 4, 5, 6];
  const participantsTries = trierParticipants(participants, config);
  const elevesComplets = participants.filter(p => estComplet(p, config)).length;
  const total = participants.length + professeursParticipants.length;

  if (loading) return <div className="text-center py-8">Chargement des participants...</div>;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <p className="text-gray-600 mt-1">
            {total} participant{total > 1 ? 's' : ''} ({participants.length} élève{participants.length > 1 ? 's' : ''}, dont {elevesComplets} complet{elevesComplets > 1 ? 's' : ''} · {professeursParticipants.length} professeur{professeursParticipants.length > 1 ? 's' : ''})
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

      {/* Filtres + permissions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <select value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Toutes les classes</option>
            {classesParticipants.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {isEmployee && (
            <select value={filtreRegime} onChange={e => setFiltreRegime(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Tous les régimes</option>
              <option value="Omnivore">🍖 Omnivore</option>
              <option value="Végétarien">🥬 Végétarien</option>
              <option value="Halal">🕌 Halal</option>
            </select>
          )}
        </div>

        {canEdit && (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={config.eleve_peut_modifier_telephone}
                onChange={e => updateElevePeutModifierTelephone(e.target.checked)} className="rounded" />
              <span>📱 Les élèves peuvent modifier leurs numéros</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={config.eleve_peut_modifier_regime}
                onChange={e => updateElevePeutModifierRegime(e.target.checked)} className="rounded" />
              <span>🍽️ Les élèves peuvent modifier leur régime</span>
            </label>
          </div>
        )}
      </div>

      {/* ── Tableau professeurs ── */}
      {professeursParticipants.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <button
            onClick={() => setExpandedTableProfs(!expandedTableProfs)}
            className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 transition flex justify-between items-center"
          >
            <div className="font-medium text-purple-800">
              👨‍🏫 Professeurs ({professeursParticipants.length})
            </div>
            <span className="text-purple-600">{expandedTableProfs ? '▲' : '▼'}</span>
          </button>

          {expandedTableProfs && (
            <div className="overflow-x-auto">
              {/* En-têtes */}
              <div className="grid gap-4 p-4 bg-purple-50 font-medium text-xs text-gray-600 uppercase border-b"
                style={{ gridTemplateColumns: colsProf }}>
                <div>Professeur</div>
                <div>Rôle</div>
                {isResponsable && <><div>Date naiss.</div><div>Nationalité</div></>}
                {isEmployee && <div>Régime</div>}
                <div>Téléphone</div>
                <div />
              </div>

              {/* Lignes */}
              {professeursParticipants.map((prof) => {
                const showPhone = isEmployee || (isEleve && prof.professeur?.eleve_voir_telephone);
                const isCurrentUser = prof.professeur_id === currentUserId;

                return (
                  <div key={prof.id} className="grid gap-4 p-4 border-b hover:bg-gray-50 items-center text-sm"
                    style={{ gridTemplateColumns: colsProf }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{prof.professeur.prenom} {prof.professeur.nom}</div>
                        {isCurrentUser && isEmployee && (
                          <button
                            onClick={() => setEditingEmploye({
                              id: prof.professeur.id,
                              nom: prof.professeur.nom,
                              prenom: prof.professeur.prenom,
                              initiale: prof.professeur.initiale,
                              email: prof.professeur.email || '',
                              telephone: prof.professeur.telephone || '',
                              eleve_voir_telephone: prof.professeur.eleve_voir_telephone || false,
                              date_naissance: prof.professeur.date_naissance || '',
                              nationalite: prof.professeur.nationalite || '',
                              regime_alimentaire: prof.professeur.regime_alimentaire,
                            })}
                            className="text-blue-600 hover:text-blue-800"
                            title="Modifier mes informations"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{prof.professeur.email || '—'}</div>
                    </div>
                    <div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                        prof.role === 'responsable' ? 'bg-yellow-100 text-yellow-800' :
                        prof.role === 'direction' ? 'bg-blue-100 text-blue-800' :
                        prof.role === 'infirmier' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {prof.role === 'accompagnateur' ? '👥 Accompagnateur' :
                        prof.role === 'responsable' ? '⭐ Responsable' :
                        prof.role === 'direction' ? '🏢 Direction' :
                        prof.role === 'infirmier' ? '🏥 Infirmier' : prof.role}
                      </span>
                    </div>
                    {isResponsable && (
                      <>
                        <div className="text-xs text-gray-600">
                          {prof.professeur.date_naissance ? new Date(prof.professeur.date_naissance).toLocaleDateString('fr-BE') : '–'}
                        </div>
                        <div className="text-xs text-gray-600">{prof.professeur.nationalite ?? '–'}</div>
                      </>
                    )}
                    {isEmployee && (
                      <RegimeCell
                        regime={parseRegime(prof.professeur.regime_alimentaire)}
                        canEdit={canEdit && isCurrentUser}
                        onUpdate={r => updateRegimeProf(prof.professeur_id, r)}
                      />
                    )}
                    <div className="text-xs text-gray-600 font-mono">
                      {showPhone && prof.professeur.telephone ? (
                        prof.professeur.telephone
                      ) : prof.professeur.telephone ? (
                        <span className="text-gray-400 italic">Non partagé</span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </div>
                    <div className="flex justify-end">
                      {canEdit && !isCurrentUser && (
                        <button onClick={() => removeParticipant(prof)} className="text-red-600 hover:text-red-800 text-xs">
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Bouton élève : Modifier mes infos ── */}
      {isEleve && (config.eleve_peut_modifier_telephone || config.eleve_peut_modifier_regime) && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              const eleve = participants.find(p => p.eleve.matricule === currentUserEleveId)?.eleve;
              if (eleve) {
                setSelfEleveData({
                  telephone_eleve: eleve.telephone_eleve || '',
                  telephone_parent: eleve.telephone_parent || '',
                  regime_alimentaire: eleve.regime_alimentaire,
                });
              }
              setEditingEleveSelf(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            ✏️ Modifier mes informations
          </button>
        </div>
      )}

      {/* ── Tableau élèves ── */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <button
          onClick={() => setExpandedTableEleves(!expandedTableEleves)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition flex justify-between items-center"
        >
          <div className="font-medium text-gray-800">
            👨‍🎓 Élèves ({participantsTries.length})
          </div>
          <span className="text-gray-600">{expandedTableEleves ? '▲' : '▼'}</span>
        </button>

        {expandedTableEleves && (
          <div className="overflow-x-auto">
            {/* En-têtes */}
            <div className="grid gap-4 p-4 bg-gray-50 font-medium text-xs text-gray-600 uppercase border-b"
              style={{ gridTemplateColumns: colsEleve }}>
              <div>Élève</div>
              <div>Classe</div>
              <div>Genre</div>
              <div className="text-center">État</div>
              {isResponsable && <><div>Date naiss.</div><div>Nationalité</div></>}
              {isEmployee && <><div>Régime</div><div>Tél. élève</div><div>Tél. parent</div></>}
              <div />
            </div>

            {/* Lignes */}
            {participantsTries
              .filter(p => !selectedClasse || p.classe === selectedClasse)
              .filter(p => {
                if (filtreRegime === 'all') return true;
                return parseRegime(p.eleve.regime_alimentaire).regime === filtreRegime;
              })
              .map((p) => {
                const complet = estComplet(p, config);

                return (
                  <div
                    key={p.id}
                    className={`grid gap-4 p-4 border-b hover:bg-gray-50 items-center text-sm ${
                      complet ? '' : 'bg-orange-50'
                    }`}
                    style={{ gridTemplateColumns: colsEleve }}
                  >
                    <div className="font-medium">{p.eleve.nom} {p.eleve.prenom}</div>
                    <div className="text-gray-600">{p.classe}</div>
                    <div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        p.genre === 'M' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.genre === 'M' ? 'Garçon' : 'Fille'}
                      </span>
                    </div>
                    <div className="text-center">
                      {complet ? (
                        <span className="text-green-600 text-lg" title="Complet">✅</span>
                      ) : (
                        <span className="text-orange-500 text-lg" title="Incomplet">⚠️</span>
                      )}
                    </div>
                    {isResponsable && (
                      <>
                        <div className="text-xs text-gray-600">
                          {p.eleve.date_naissance ? new Date(p.eleve.date_naissance).toLocaleDateString('fr-BE') : '–'}
                        </div>
                        <div className="text-xs text-gray-600">{p.eleve.nationalite ?? '–'}</div>
                      </>
                    )}
                    {isEmployee && (
                      <>
                        <RegimeCell
                          regime={parseRegime(p.eleve.regime_alimentaire)}
                          canEdit={canEdit || (isEleve && config.eleve_peut_modifier_regime && p.eleve.matricule === currentUserEleveId)}
                          onUpdate={r => updateRegimeEleve(p.eleve.matricule, r)}
                        />
                        <div className="text-xs font-mono">
                          {p.eleve.telephone_eleve ? p.eleve.telephone_eleve : <span className="text-gray-400 italic">—</span>}
                        </div>
                        <div className="text-xs font-mono">
                          {p.eleve.telephone_parent ? p.eleve.telephone_parent : <span className="text-gray-400 italic">—</span>}
                        </div>
                      </>
                    )}
                    <div className="flex justify-end">
                      {canEdit && (
                        <div className="flex gap-2">
                          <button onClick={() => setEditingEleve(p.eleve)} className="text-blue-600 hover:text-blue-800 text-xs" title="Modifier téléphones">
                            ✏️
                          </button>
                          <button onClick={() => removeParticipant(p)} className="text-red-500 hover:text-red-700 text-xs" title="Retirer du voyage">
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            {participantsTries.length === 0 && (
              <p className="text-center py-8 text-gray-500">Aucun élève participant pour le moment.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Modal export ── */}
      {showExportModal && (
        <ModalExport
          participants={participants}
          professeursParticipants={professeursParticipants}
          config={config}
          isResponsable={isResponsable}
          isEmployee={isEmployee}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* ── Modal ajout ── */}
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
                      className={`px-4 py-2 rounded-lg text-sm ${addMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
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

      {/* ── Modal édition élève (responsable) ── */}
      {canEdit && editingEleve && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Téléphones</h3>
                <button onClick={() => setEditingEleve(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <p className="text-sm text-gray-500 mt-1">{editingEleve.prenom} {editingEleve.nom}</p>
            </div>
            <form onSubmit={updateEleveInfo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📱 Téléphone de l'élève</label>
                <input name="telephone_eleve" type="tel" defaultValue={editingEleve.telephone_eleve || ''}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="+32 123 45 67 89" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">👪 Téléphone d'un parent</label>
                <input name="telephone_parent" type="tel" defaultValue={editingEleve.telephone_parent || ''}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="+32 123 45 67 89" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingEleve(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal édition employé (soi-même) ── */}
      {editingEmploye && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Mes informations personnelles</h3>
                <button onClick={() => setEditingEmploye(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <p className="text-sm text-gray-500 mt-1">{editingEmploye.prenom} {editingEmploye.nom}</p>
            </div>
            <form onSubmit={updateEmployeInfo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📧 Email</label>
                <input name="email" type="email" defaultValue={editingEmploye.email || ''}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="exemple@ecole.be" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📞 Téléphone</label>
                <input name="telephone" type="tel" defaultValue={editingEmploye.telephone || ''}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="+32 123 45 67 89" />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input name="eleve_voir_telephone" type="checkbox" defaultChecked={editingEmploye.eleve_voir_telephone || false} className="rounded" />
                  <span className="text-sm text-gray-700">Les élèves peuvent voir mon numéro de téléphone</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🎂 Date de naissance</label>
                <input name="date_naissance" type="date" defaultValue={editingEmploye.date_naissance?.split('T')[0] || ''}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🌍 Nationalité</label>
                <input name="nationalite" type="text" defaultValue={editingEmploye.nationalite || ''}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: Belge" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🍽️ Régime alimentaire</label>
                <select name="regime" defaultValue={parseRegime(editingEmploye.regime_alimentaire).regime}
                  className="w-full px-3 py-2 border rounded-lg">
                  <option value="Omnivore">Omnivore</option>
                  <option value="Végétarien">Végétarien</option>
                  <option value="Halal">Halal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📝 Allergies / intolérances</label>
                <textarea name="regime_notes" rows={3} defaultValue={parseRegime(editingEmploye.regime_alimentaire).notes}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: allergie aux noix..." />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setEditingEmploye(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal édition élève (soi-même) ── */}
      {isEleve && editingEleveSelf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Mes informations</h3>
                <button onClick={() => setEditingEleveSelf(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <form onSubmit={updateSelfEleveInfo} className="p-6 space-y-4">
              {config.eleve_peut_modifier_telephone && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📱 Mon téléphone</label>
                    <input name="telephone_eleve" type="tel" defaultValue={selfEleveData.telephone_eleve || ''}
                      className="w-full px-3 py-2 border rounded-lg" placeholder="+32 123 45 67 89" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">👪 Téléphone d'un parent</label>
                    <input name="telephone_parent" type="tel" defaultValue={selfEleveData.telephone_parent || ''}
                      className="w-full px-3 py-2 border rounded-lg" placeholder="+32 123 45 67 89" />
                  </div>
                </>
              )}
              {config.eleve_peut_modifier_regime && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">🍽️ Régime alimentaire</label>
                    <select name="regime" defaultValue={parseRegime(selfEleveData.regime_alimentaire).regime}
                      className="w-full px-3 py-2 border rounded-lg">
                      <option value="Omnivore">Omnivore</option>
                      <option value="Végétarien">Végétarien</option>
                      <option value="Halal">Halal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📝 Allergies / intolérances</label>
                    <textarea name="regime_notes" rows={3} defaultValue={parseRegime(selfEleveData.regime_alimentaire).notes}
                      className="w-full px-3 py-2 rounded-lg border" placeholder="Ex: allergie aux noix..." />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingEleveSelf(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}