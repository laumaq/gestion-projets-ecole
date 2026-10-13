// /components/conseilLutte/repartition.ts

import { supabase } from '@/lib/supabase';
import { CONSEIL_LUTTE_ADMINS } from './admins';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ORDRE_ETAGES: Record<string, number> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, 'Annexe': 7,
};

function trierGroupesParLocal(groupes: any[]) {
  return [...groupes].sort((a, b) => {
    const la = Array.isArray(a.localisation_fixe) ? a.localisation_fixe[0] : a.localisation_fixe;
    const lb = Array.isArray(b.localisation_fixe) ? b.localisation_fixe[0] : b.localisation_fixe;
    const ea = la ? (ORDRE_ETAGES[String(la.etage)] ?? 99) : 99;
    const eb = lb ? (ORDRE_ETAGES[String(lb.etage)] ?? 99) : 99;
    if (ea !== eb) return ea - eb;
    return String(la?.id || '').localeCompare(String(lb?.id || ''), undefined, { numeric: true });
  });
}

function hm2min(s: string): number {
  if (!s) return -1;
  const sep = s.includes(':') ? ':' : (s.includes('h') ? 'h' : null);
  if (!sep) return -1;
  const [h, m] = s.split(sep).map(x => parseInt(x, 10));
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// 1. Répartition automatique des ÉLÈVES
// ---------------------------------------------------------------------------

interface RepartirParams {
  phaseId: string;
  nbGroupes: number;
  parAnnee: boolean;
  modeClasses: 'groupees' | 'aleatoire' | 'dispersees';
}

interface RepartirResult {
  elevesPlaces: number;
  elevesIgnores: number;
}

export async function repartirAuto({
  phaseId, parAnnee, modeClasses,
}: RepartirParams): Promise<RepartirResult> {
  const { data: groupes, error: gErr } = await supabase
    .from('conseil_lutte_groupes')
    .select('id')
    .eq('phase_id', phaseId);
  if (gErr || !groupes || groupes.length === 0) throw new Error('Aucun groupe dans cette phase.');

  // Animateurs déclarés pour cette phase → exclus de la répartition
  const { data: anims } = await supabase
    .from('conseil_lutte_animateurs')
    .select('student_matricule')
    .eq('phase_id', phaseId);
  const animateursSet = new Set<number>((anims || []).map(a => a.student_matricule));

  // Membres existants
  const { data: membresExistants } = await supabase
    .from('conseil_lutte_membres')
    .select('id, groupe_id, participant_id, manuel')
    .in('groupe_id', groupes.map(g => g.id))
    .eq('participant_type', 'student');

  // SÉCURITÉ : forcer manuel=true pour tout animateur qui ne l'est pas encore
  const aCorriger = (membresExistants || []).filter(m =>
    !m.manuel && animateursSet.has(parseInt(m.participant_id))
  );
  if (aCorriger.length > 0) {
    await supabase
      .from('conseil_lutte_membres')
      .update({ manuel: true })
      .in('id', aCorriger.map(m => m.id));
    // Mettre à jour localement pour la suite
    aCorriger.forEach(m => { m.manuel = true; });
  }

  // Maintenant on peut filtrer proprement
  const manuels = (membresExistants || []).filter(m => m.manuel);
  const manuelsSet = new Set<number>(manuels.map(m => parseInt(m.participant_id)));

  // Supprimer les non-manuels (les animateurs sont désormais manuels → préservés)
  const nonManuelsIds = (membresExistants || []).filter(m => !m.manuel).map(m => m.id);
  if (nonManuelsIds.length > 0) {
    for (let i = 0; i < nonManuelsIds.length; i += 500) {
      await supabase.from('conseil_lutte_membres')
        .delete().in('id', nonManuelsIds.slice(i, i + 500));
    }
  }

  // Charger les élèves convoqués (hors testeur, niveau 0, animateurs)
  const eleves: any[] = [];
  let from = 0;
  const PAGE = 500;
  while (true) {
    const { data, error } = await supabase
      .from('students')
      .select('matricule, nom, prenom, classe, niveau')
      .order('matricule')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const s of data) {
      if (s.nom?.toLowerCase().includes('testeur')) continue;
      if (!s.niveau || s.niveau === '0') continue;
      if (animateursSet.has(s.matricule)) continue;
      eleves.push(s);
    }
    if (data.length < PAGE) break;
    from += data.length;
  }

  const elevesARepartir = eleves.filter(e => !manuelsSet.has(e.matricule));

  const groupeIds = groupes.map(g => g.id);
  const places: { groupeId: string; matricule: number }[] = [];

  if (parAnnee) {
    const parNiveau: Record<string, any[]> = {};
    elevesARepartir.forEach(e => {
      const n = String(e.niveau);
      if (!parNiveau[n]) parNiveau[n] = [];
      parNiveau[n].push(e);
    });

    for (const niveau of Object.keys(parNiveau).sort()) {
      const pool = parNiveau[niveau];
      const placements = dispatcher(pool, groupeIds, modeClasses);
      places.push(...placements);
    }
  } else {
    const placements = dispatcher(elevesARepartir, groupeIds, modeClasses);
    places.push(...placements);
  }

  if (places.length > 0) {
    const rows = places.map(p => ({
      groupe_id: p.groupeId,
      participant_id: p.matricule.toString(),
      participant_type: 'student',
      manuel: false,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('conseil_lutte_membres').insert(rows.slice(i, i + 200));
      if (error) throw error;
    }
  }

  return {
    elevesPlaces: places.length,
    elevesIgnores: eleves.length - places.length,
  };
}

function dispatcher(
  pool: any[],
  groupeIds: string[],
  mode: 'groupees' | 'aleatoire' | 'dispersees',
): { groupeId: string; matricule: number }[] {
  if (mode === 'aleatoire') return dispatcherAleatoire(pool, groupeIds);
  if (mode === 'groupees') return dispatcherGroupees(pool, groupeIds);
  return dispatcherDispersees(pool, groupeIds);
}

function dispatcherAleatoire(pool: any[], groupeIds: string[]) {
  const shuffled = shuffle(pool);
  return shuffled.map((e, i) => ({
    groupeId: groupeIds[i % groupeIds.length],
    matricule: e.matricule,
  }));
}

function dispatcherGroupees(pool: any[], groupeIds: string[]) {
  const parClasse: Record<string, any[]> = {};
  pool.forEach(e => {
    const c = e.classe || '—';
    if (!parClasse[c]) parClasse[c] = [];
    parClasse[c].push(e);
  });
  const classes = Object.keys(parClasse).sort((a, b) => parClasse[b].length - parClasse[a].length);

  const placements: { groupeId: string; matricule: number }[] = [];
  let gIdx = 0;
  for (const c of classes) {
    for (const eleve of parClasse[c]) {
      placements.push({ groupeId: groupeIds[gIdx % groupeIds.length], matricule: eleve.matricule });
      gIdx++;
    }
  }
  return placements;
}

function dispatcherDispersees(pool: any[], groupeIds: string[]) {
  const parClasse: Record<string, any[]> = {};
  pool.forEach(e => {
    const c = e.classe || '—';
    if (!parClasse[c]) parClasse[c] = [];
    parClasse[c].push(e);
  });
  Object.keys(parClasse).forEach(c => parClasse[c] = shuffle(parClasse[c]));

  const placements: { groupeId: string; matricule: number }[] = [];
  for (const c of Object.keys(parClasse)) {
    const start = Math.floor(Math.random() * groupeIds.length);
    parClasse[c].forEach((eleve, i) => {
      placements.push({
        groupeId: groupeIds[(start + i) % groupeIds.length],
        matricule: eleve.matricule,
      });
    });
  }
  return placements;
}

// ---------------------------------------------------------------------------
// 2. Répartition automatique des PROFS
// ---------------------------------------------------------------------------

export interface FenetreHoraire {
  debut: string;
  fin: string;
}

export interface AssignerProfsParams {
  phaseId: string;
  anneeScolaire: string;
  minHeures: number;
  fenetre: FenetreHoraire;
  jour: string;
  reset?: boolean;
}

export interface AssignerProfsResult {
  profsEligibles: number;
  profsPlaces: number;
  profsIgnores: number;
}

export async function assignerProfsAuto(params: AssignerProfsParams): Promise<AssignerProfsResult> {
  const {
    phaseId, anneeScolaire, minHeures, fenetre, jour, reset = false,
  } = params;

  const { data: groupes, error: gErr } = await supabase
    .from('conseil_lutte_groupes')
    .select(`id, nom, localisation_fixe (id, etage)`)
    .eq('phase_id', phaseId);
  if (gErr) throw gErr;
  if (!groupes || groupes.length === 0) throw new Error('Aucun groupe.');

  const groupesTries = trierGroupesParLocal(groupes);

  if (reset) {
    const { data: existants } = await supabase
      .from('conseil_lutte_membres')
      .select('id, manuel')
      .in('groupe_id', groupesTries.map((g: any) => g.id))
      .eq('participant_type', 'employee');
    const aSupprimer = (existants || []).filter(m => !m.manuel).map(m => m.id);
    for (let i = 0; i < aSupprimer.length; i += 500) {
      const { error } = await supabase
        .from('conseil_lutte_membres')
        .delete()
        .in('id', aSupprimer.slice(i, i + 500));
      if (error) throw error;
    }
  }

  const courses: any[] = [];
  let from = 0;
  const PAGE = 500;
  while (true) {
    const { data, error } = await supabase
      .from('courses')
      .select('prof, heure_debut, heure_fin')
      .eq('annee_scolaire', anneeScolaire)
      .eq('jour', jour)
      .not('prof', 'is', null)
      .neq('prof', '')
      .neq('prof', '[]')
      .order('cours_id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    courses.push(...data);
    if (data.length < PAGE) break;
    from += data.length;
  }

  const fenD = hm2min(fenetre.debut);
  const fenF = hm2min(fenetre.fin);
  if (fenD < 0 || fenF < 0 || fenF <= fenD) throw new Error('Fenêtre horaire invalide.');

  const compteParProf = new Map<string, number>();
  for (const c of courses) {
    const d = hm2min(c.heure_debut);
    const f = hm2min(c.heure_fin);
    if (d < 0 || f < 0) continue;
    if (d >= fenF || f <= fenD) continue;

    let ids: any[] = [];
    try { ids = JSON.parse(c.prof); } catch { continue; }
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      if (typeof id !== 'string' || id.length === 0) continue;
      compteParProf.set(id, (compteParProf.get(id) || 0) + 1);
    }
  }

  const idsEligibles = Array.from(compteParProf.entries())
    .filter(([id, n]) => n >= minHeures && !CONSEIL_LUTTE_ADMINS.includes(id))
    .map(([id]) => id);

  if (idsEligibles.length === 0) {
    return { profsEligibles: 0, profsPlaces: 0, profsIgnores: 0 };
  }

  const { data: profs, error: pErr } = await supabase
    .from('employees')
    .select('id, nom, prenom')
    .eq('job', 'prof')
    .in('id', idsEligibles);
  if (pErr) throw pErr;

  const eligibles = profs || [];

  const { data: profsEnPlace } = await supabase
    .from('conseil_lutte_membres')
    .select('groupe_id, participant_id')
    .in('groupe_id', groupesTries.map((g: any) => g.id))
    .eq('participant_type', 'employee');

  const compteParGroupe: Record<string, number> = {};
  const dejaAffectes = new Set<string>();
  groupesTries.forEach((g: any) => { compteParGroupe[g.id] = 0; });
  (profsEnPlace || []).forEach(m => {
    compteParGroupe[m.groupe_id] = (compteParGroupe[m.groupe_id] || 0) + 1;
    dejaAffectes.add(m.participant_id);
  });

  const aPlacer = eligibles.filter(p => !dejaAffectes.has(p.id));
  const profsIgnores = eligibles.length - aPlacer.length;

  const placements: any[] = [];
  const shuffled = shuffle(aPlacer);

  for (const prof of shuffled) {
    let meilleur: any = groupesTries[0];
    let minCount = compteParGroupe[meilleur.id];
    for (const g of groupesTries) {
      const c = compteParGroupe[(g as any).id];
      if (c < minCount) {
        minCount = c;
        meilleur = g;
      }
    }
    placements.push({
      groupe_id: (meilleur as any).id,
      participant_id: prof.id,
      participant_type: 'employee',
      manuel: false,
    });
    compteParGroupe[(meilleur as any).id] = minCount + 1;
  }

  if (placements.length > 0) {
    for (let i = 0; i < placements.length; i += 200) {
      const { error } = await supabase
        .from('conseil_lutte_membres')
        .insert(placements.slice(i, i + 200));
      if (error) throw error;
    }
  }

  return {
    profsEligibles: eligibles.length,
    profsPlaces: placements.length,
    profsIgnores,
  };
}

// ---------------------------------------------------------------------------
// 3. Répartition des ANIMATEURS déclarés
// ---------------------------------------------------------------------------

export async function repartirAnimateurs(params: {
  phaseId: string;
}): Promise<{ animateursPlaces: number; animateursRestants: number }> {
  const { phaseId } = params;

  const { data: groupes, error: gErr } = await supabase
    .from('conseil_lutte_groupes')
    .select(`id, nom, localisation_fixe (id, etage)`)
    .eq('phase_id', phaseId);
  if (gErr) throw gErr;
  if (!groupes || groupes.length === 0) throw new Error('Aucun groupe.');
  const groupesTries = trierGroupesParLocal(groupes);

  // 1. Animateurs de la phase
  const { data: anims } = await supabase
    .from('conseil_lutte_animateurs')
    .select('student_matricule')
    .eq('phase_id', phaseId);
  const animateursSet = new Set<number>((anims || []).map(a => a.student_matricule));
  if (animateursSet.size === 0) {
    return { animateursPlaces: 0, animateursRestants: 0 };
  }

  // 2. Récupérer les membres actuels pour savoir qui est déjà placé et dans quel groupe
  const { data: membres } = await supabase
    .from('conseil_lutte_membres')
    .select('groupe_id, participant_id')
    .in('groupe_id', groupesTries.map((g: any) => g.id))
    .eq('participant_type', 'student');

  const dejaPlaces = new Set<number>();
  const groupesAvecAnim = new Set<string>();
  (membres || []).forEach(m => {
    const mat = parseInt(m.participant_id);
    if (animateursSet.has(mat)) {
      dejaPlaces.add(mat);
      groupesAvecAnim.add(m.groupe_id);
    }
  });

  const aPlacer = Array.from(animateursSet).filter(m => !dejaPlaces.has(m));
  if (aPlacer.length === 0) {
    return { animateursPlaces: 0, animateursRestants: 0 };
  }

  // 3. Filtrer les élèves éligibles (hors testeur, niveau 0)
  const { data: eleves } = await supabase
    .from('students')
    .select('matricule, nom, prenom, classe, niveau')
    .in('matricule', aPlacer);

  const eligibles = (eleves || []).filter(s =>
    !s.nom?.toLowerCase().includes('testeur') &&
    s.niveau && s.niveau !== '0'
  );

  // 4. Placer 1 anim par groupe libre, dans l'ordre étage → numéro
  const placements: any[] = [];
  let idx = 0;
  for (const g of groupesTries) {
    if (idx >= eligibles.length) break;
    if (groupesAvecAnim.has((g as any).id)) continue;
    placements.push({
      groupe_id: (g as any).id,
      participant_id: eligibles[idx].matricule.toString(),
      participant_type: 'student',
      manuel: true,
    });
    idx++;
  }

  if (placements.length > 0) {
    const { error } = await supabase
      .from('conseil_lutte_membres')
      .insert(placements);
    if (error) throw error;
  }

  return {
    animateursPlaces: placements.length,
    animateursRestants: eligibles.length - placements.length,
  };
}