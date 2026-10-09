// /components/conseilLutte/repartition.ts

import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Helpers génériques
// ---------------------------------------------------------------------------

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

// "HH:MM" → minutes depuis minuit
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
  phaseId, nbGroupes, parAnnee, modeClasses,
}: RepartirParams): Promise<RepartirResult> {
  const { data: groupes, error: gErr } = await supabase
    .from('conseil_lutte_groupes')
    .select('id, capacite_max')
    .eq('phase_id', phaseId);
  if (gErr || !groupes || groupes.length === 0) throw new Error('Aucun groupe dans cette phase.');

  const { data: membresExistants } = await supabase
    .from('conseil_lutte_membres')
    .select('id, groupe_id, participant_id, manuel')
    .in('groupe_id', groupes.map(g => g.id))
    .eq('participant_type', 'student');

  const manuels = (membresExistants || []).filter(m => m.manuel);
  const manuelsParGroupe: Record<string, Set<number>> = {};
  groupes.forEach(g => manuelsParGroupe[g.id] = new Set());
  manuels.forEach(m => manuelsParGroupe[m.groupe_id]?.add(parseInt(m.participant_id)));

  const nonManuelsIds = (membresExistants || []).filter(m => !m.manuel).map(m => m.id);
  if (nonManuelsIds.length > 0) {
    for (let i = 0; i < nonManuelsIds.length; i += 500) {
      await supabase.from('conseil_lutte_membres')
        .delete().in('id', nonManuelsIds.slice(i, i + 500));
    }
  }

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
      eleves.push(s);
    }
    if (data.length < PAGE) break;
    from += data.length;
  }

  const manuelsSet = new Set<number>();
  Object.values(manuelsParGroupe).forEach(s => s.forEach(m => manuelsSet.add(m)));
  const elevesARepartir = eleves.filter(e => !manuelsSet.has(e.matricule));

  const occupation = new Map<string, number>();
  groupes.forEach(g => occupation.set(g.id, manuelsParGroupe[g.id].size));

  const places: { groupeId: string; matricule: number }[] = [];
  const capaciteDe = (gId: string) => {
    const g = groupes.find(x => x.id === gId)!;
    const cap = g.capacite_max ?? Infinity;
    return Math.max(0, cap - (occupation.get(gId) || 0));
  };

  if (parAnnee) {
    const parNiveau: Record<string, any[]> = {};
    elevesARepartir.forEach(e => {
      const n = String(e.niveau);
      if (!parNiveau[n]) parNiveau[n] = [];
      parNiveau[n].push(e);
    });

    for (const niveau of Object.keys(parNiveau).sort()) {
      const pool = parNiveau[niveau];
      const cibles = groupes
        .map(g => ({ id: g.id, cap: capaciteDe(g.id) }))
        .filter(g => g.cap > 0)
        .map(g => g.id);
      if (cibles.length === 0) continue;

      const placements = dispatcher(pool, cibles, modeClasses, capaciteDe);
      placements.forEach(p => {
        places.push(p);
        occupation.set(p.groupeId, (occupation.get(p.groupeId) || 0) + 1);
      });
    }
  } else {
    const cibles = groupes.map(g => g.id).filter(g => capaciteDe(g) > 0);
    const placements = dispatcher(elevesARepartir, cibles, modeClasses, capaciteDe);
    placements.forEach(p => {
      places.push(p);
      occupation.set(p.groupeId, (occupation.get(p.groupeId) || 0) + 1);
    });
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
  capaciteDe: (id: string) => number,
): { groupeId: string; matricule: number }[] {
  if (mode === 'aleatoire') return dispatcherAleatoire(pool, groupeIds, capaciteDe);
  if (mode === 'groupees') return dispatcherGroupees(pool, groupeIds, capaciteDe);
  return dispatcherDispersees(pool, groupeIds, capaciteDe);
}

function dispatcherAleatoire(pool: any[], groupeIds: string[], capaciteDe: (id: string) => number) {
  const shuffled = shuffle(pool);
  const placements: { groupeId: string; matricule: number }[] = [];
  const curseurs: Record<string, number> = {};
  groupeIds.forEach(id => curseurs[id] = 0);
  let global = 0;

  for (const eleve of shuffled) {
    let placed = false;
    for (let i = 0; i < groupeIds.length; i++) {
      const idx = (global + i) % groupeIds.length;
      const gId = groupeIds[idx];
      if (curseurs[gId] < capaciteDe(gId)) {
        placements.push({ groupeId: gId, matricule: eleve.matricule });
        curseurs[gId]++;
        global = (idx + 1) % groupeIds.length;
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }
  return placements;
}

function dispatcherGroupees(pool: any[], groupeIds: string[], capaciteDe: (id: string) => number) {
  const parClasse: Record<string, any[]> = {};
  pool.forEach(e => {
    const c = e.classe || '—';
    if (!parClasse[c]) parClasse[c] = [];
    parClasse[c].push(e);
  });
  const classes = Object.keys(parClasse).sort((a, b) => parClasse[b].length - parClasse[a].length);

  const placements: { groupeId: string; matricule: number }[] = [];
  const restants: Record<string, number> = {};
  groupeIds.forEach(id => restants[id] = capaciteDe(id));

  for (const c of classes) {
    const file = [...parClasse[c]];
    for (const gId of groupeIds) {
      let cap = restants[gId];
      while (cap > 0 && file.length > 0) {
        placements.push({ groupeId: gId, matricule: file.shift()!.matricule });
        cap--; restants[gId]--;
      }
      if (file.length === 0) break;
    }
    while (file.length > 0) {
      let placed = false;
      for (const gId of groupeIds) {
        if (restants[gId] > 0) {
          placements.push({ groupeId: gId, matricule: file.shift()!.matricule });
          restants[gId]--;
          placed = true;
          break;
        }
      }
      if (!placed) break;
    }
  }
  return placements;
}

function dispatcherDispersees(pool: any[], groupeIds: string[], capaciteDe: (id: string) => number) {
  const parClasse: Record<string, any[]> = {};
  pool.forEach(e => {
    const c = e.classe || '—';
    if (!parClasse[c]) parClasse[c] = [];
    parClasse[c].push(e);
  });
  Object.keys(parClasse).forEach(c => parClasse[c] = shuffle(parClasse[c]));

  const placements: { groupeId: string; matricule: number }[] = [];
  const restants: Record<string, number> = {};
  groupeIds.forEach(id => restants[id] = capaciteDe(id));

  for (const c of Object.keys(parClasse).sort((a, b) => parClasse[b].length - parClasse[a].length)) {
    const file = parClasse[c];
    const start = Math.floor(Math.random() * groupeIds.length);
    let i = 0;
    while (i < file.length) {
      const gId = groupeIds[(start + i) % groupeIds.length];
      if (restants[gId] > 0) {
        placements.push({ groupeId: gId, matricule: file[i].matricule });
        restants[gId]--; i++;
      } else {
        let placed = false;
        for (const alt of groupeIds) {
          if (restants[alt] > 0) {
            placements.push({ groupeId: alt, matricule: file[i].matricule });
            restants[alt]--; i++; placed = true;
            break;
          }
        }
        if (!placed) break;
      }
    }
  }
  return placements;
}

// ---------------------------------------------------------------------------
// 2. Répartition automatique des PROFS
// ---------------------------------------------------------------------------

export interface FenetreHoraire {
  debut: string; // 'HH:MM'
  fin: string;   // 'HH:MM'
}

export interface AssignerProfsParams {
  phaseId: string;
  anneeScolaire: string;

  // Combien d'heures minimum dans la fenêtre pour être éligible
  minHeures: number;

  // Fenêtre : soit celle de la phase, soit manuelle (choix dans l'UI admin)
  fenetre: FenetreHoraire;

  // Jour concerné ('mardi', 'lundi', ...) — cohérent avec courses.jour
  jour: string;

  // Si true : efface les profs non-manuels déjà placés avant de recalculer.
  // Si false : ajoute seulement aux groupes qui n'ont pas encore de prof.
  reset?: boolean;
}

export interface AssignerProfsResult {
  profsEligibles: number;
  profsPlaces: number;
  profsIgnores: number;
}

export async function assignerProfsAuto(params: AssignerProfsParams): Promise<AssignerProfsResult> {
  const {
    phaseId,
    anneeScolaire,
    minHeures,
    fenetre,
    jour,
    reset = false,
  } = params;

  // 1. Groupes de la phase, triés par local
  const { data: groupes, error: gErr } = await supabase
    .from('conseil_lutte_groupes')
    .select(`id, nom, localisation_fixe (id, etage)`)
    .eq('phase_id', phaseId);
  if (gErr) throw gErr;
  if (!groupes || groupes.length === 0) throw new Error('Aucun groupe.');

  const groupesTries = trierGroupesParLocal(groupes);

  // 2. (Optionnel) Reset : supprimer tous les profs non-manuels des groupes de la phase
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

  // 3. Charger les cours du jour (pagination)
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

  // 4. Calculer, pour chaque prof, combien de plages chevauchent la fenêtre
  const fenD = hm2min(fenetre.debut);
  const fenF = hm2min(fenetre.fin);
  if (fenD < 0 || fenF < 0 || fenF <= fenD) throw new Error('Fenêtre horaire invalide.');

  const compteParProf = new Map<string, number>();
  for (const c of courses) {
    const d = hm2min(c.heure_debut);
    const f = hm2min(c.heure_fin);
    if (d < 0 || f < 0) continue;
    // Chevauchement strict : [d, f[ ∩ [fenD, fenF[ ≠ ∅
    if (d >= fenF || f <= fenD) continue;

    let ids: any[] = [];
    try { ids = JSON.parse(c.prof); } catch { continue; }
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      if (typeof id !== 'string' || id.length === 0) continue;
      compteParProf.set(id, (compteParProf.get(id) || 0) + 1);
    }
  }

  // 5. Retenir les profs avec >= minHeures plages
  const idsEligibles = Array.from(compteParProf.entries())
    .filter(([_, n]) => n >= minHeures)
    .map(([id]) => id);

  if (idsEligibles.length === 0) {
    return { profsEligibles: 0, profsPlaces: 0, profsIgnores: 0 };
  }

  // 6. Ne garder que les employees dont le job est 'prof'
  const { data: profs, error: pErr } = await supabase
    .from('employees')
    .select('id, nom, prenom')
    .eq('job', 'prof')
    .in('id', idsEligibles);
  if (pErr) throw pErr;

  const eligibles = profs || [];

  // 7. Compter les profs déjà présents dans chaque groupe (manuels + auto existants)
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

  // 8. Retirer les profs déjà placés (où qu'ils soient) — pour ne pas faire de doublons
  const aPlacer = eligibles.filter(p => !dejaAffectes.has(p.id));
  const profsIgnores = eligibles.length - aPlacer.length;

  // 9. Distribution équitable : à chaque prof, on le met dans le groupe
  //    qui a le MOINS de profs actuellement (avec l'ordre étage → numéro en cas d'égalité).
  const placements: any[] = [];
  const shuffled = shuffle(aPlacer);

  for (const prof of shuffled) {
    // Trouver le groupe avec le minimum actuel
    let meilleur: any = groupesTries[0];
    let minCount = compteParGroupe[meilleur.id];
    for (const g of groupesTries) {
      const c = compteParGroupe[(g as any).id];
      if (c < minCount) {
        minCount = c;
        meilleur = g;
      }
      // en cas d'égalité, on garde le premier (donc l'ordre étage → numéro est préservé)
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