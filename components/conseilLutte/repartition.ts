// /components/conseilLutte/repartition.ts

import { supabase } from '@/lib/supabase';

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

// Fisher–Yates
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function repartirAuto({
  phaseId, nbGroupes, parAnnee, modeClasses,
}: RepartirParams): Promise<RepartirResult> {
  // 1. Charger les groupes
  const { data: groupes, error: gErr } = await supabase
    .from('conseil_lutte_groupes')
    .select('id, capacite_max')
    .eq('phase_id', phaseId);
  if (gErr || !groupes || groupes.length === 0) throw new Error('Aucun groupe dans cette phase.');

  // 2. Charger les membres déjà présents (élèves uniquement)
  const { data: membresExistants } = await supabase
    .from('conseil_lutte_membres')
    .select('id, groupe_id, participant_id, manuel')
    .in('groupe_id', groupes.map(g => g.id))
    .eq('participant_type', 'student');

  // 3. Identifier les élèves "manuels" à préserver
  const manuels = (membresExistants || []).filter(m => m.manuel);
  const manuelsParGroupe: Record<string, Set<number>> = {};
  groupes.forEach(g => manuelsParGroupe[g.id] = new Set());
  manuels.forEach(m => manuelsParGroupe[m.groupe_id]?.add(parseInt(m.participant_id)));

  // 4. Supprimer les affectations NON manuelles existantes
  const nonManuelsIds = (membresExistants || []).filter(m => !m.manuel).map(m => m.id);
  if (nonManuelsIds.length > 0) {
    // chunk par 500 pour éviter la limite URL
    for (let i = 0; i < nonManuelsIds.length; i += 500) {
      await supabase.from('conseil_lutte_membres')
        .delete().in('id', nonManuelsIds.slice(i, i + 500));
    }
  }

  // 5. Charger tous les élèves convoqués (hors testeur / niveau 0)
  //    Pagination obligatoire (Supabase plafonne à 1000)
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

  // 6. Retirer de la liste les élèves déjà "manuels"
  const manuelsSet = new Set<number>();
  Object.values(manuelsParGroupe).forEach(s => s.forEach(m => manuelsSet.add(m)));
  const elevesARepartir = eleves.filter(e => !manuelsSet.has(e.matricule));

  // 7. Calculer la capacité actuelle de chaque groupe (manuels déjà placés comptent)
  const occupation = new Map<string, number>();
  groupes.forEach(g => occupation.set(g.id, manuelsParGroupe[g.id].size));

  // 8. Algorithme
  const places: { groupeId: string; matricule: number }[] = [];

  const capaciteDe = (gId: string) => {
    const g = groupes.find(x => x.id === gId)!;
    const cap = g.capacite_max ?? Infinity;
    return Math.max(0, cap - (occupation.get(gId) || 0));
  };

  // On traite groupe par groupe (dans un ordre stable), et on décide de qui y va.
  // Selon le mode, on itère sur les élèves de manières différentes.

  if (parAnnee) {
    // ---- Répartition par niveau ----
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

      const placements = dispatcher(pool, cibles, modeClasses, occupation, capaciteDe);
      placements.forEach(p => {
        places.push(p);
        occupation.set(p.groupeId, (occupation.get(p.groupeId) || 0) + 1);
      });
    }
  } else {
    // ---- Tous niveaux confondus ----
    const cibles = groupes.map(g => g.id).filter(g => capaciteDe(g) > 0);
    const placements = dispatcher(elevesARepartir, cibles, modeClasses, occupation, capaciteDe);
    placements.forEach(p => {
      places.push(p);
      occupation.set(p.groupeId, (occupation.get(p.groupeId) || 0) + 1);
    });
  }

  // 9. Insertion par batch (upsert pour idempotence)
  if (places.length > 0) {
    const rows = places.map(p => ({
      groupe_id: p.groupeId,
      participant_id: p.matricule.toString(),
      participant_type: 'student',
      manuel: false,
    }));

    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error } = await supabase.from('conseil_lutte_membres').insert(slice);
      if (error) throw error;
    }
  }

  return {
    elevesPlaces: places.length,
    elevesIgnores: eleves.length - elevesARepartir.length - manuelsSet.size + (elevesARepartir.length - places.length),
  };
}

// ---- Dispatcher selon les 3 modes classes ----

function dispatcher(
  pool: any[],
  groupeIds: string[],
  mode: 'groupees' | 'aleatoire' | 'dispersees',
  occupation: Map<string, number>,
  capaciteDe: (id: string) => number,
): { groupeId: string; matricule: number }[] {
  if (mode === 'aleatoire') return dispatcherAleatoire(pool, groupeIds, capaciteDe);
  if (mode === 'groupees') return dispatcherGroupees(pool, groupeIds, capaciteDe);
  return dispatcherDispersees(pool, groupeIds, capaciteDe);
}

// Aléatoire pur : on mélange et on remplit en round-robin
function dispatcherAleatoire(pool: any[], groupeIds: string[], capaciteDe: (id: string) => number) {
  const shuffled = shuffle(pool);
  const placements: { groupeId: string; matricule: number }[] = [];
  const curseurs: Record<string, number> = {};
  groupeIds.forEach(id => curseurs[id] = 0);

  for (const eleve of shuffled) {
    // Cherche un groupe non-plein, en round-robin
    let placed = false;
    for (let i = 0; i < groupeIds.length; i++) {
      const idx = (curseurs['__global'] || 0) + i;
      const gId = groupeIds[idx % groupeIds.length];
      if (curseurs[gId] < capaciteDe(gId)) {
        placements.push({ groupeId: gId, matricule: eleve.matricule });
        curseurs[gId]++;
        curseurs['__global'] = (idx + 1) % groupeIds.length;
        placed = true;
        break;
      }
    }
    if (!placed) break; // tout est plein
  }
  return placements;
}

// Classes groupées : on trie les élèves par classe, puis on remplit les groupes un par un avec la même classe
function dispatcherGroupees(pool: any[], groupeIds: string[], capaciteDe: (id: string) => number) {
  const parClasse: Record<string, any[]> = {};
  pool.forEach(e => {
    const c = e.classe || '—';
    if (!parClasse[c]) parClasse[c] = [];
    parClasse[c].push(e);
  });
  // Trie les classes par taille décroissante (pour bien caser les grosses)
  const classes = Object.keys(parClasse).sort((a, b) => parClasse[b].length - parClasse[a].length);

  const placements: { groupeId: string; matricule: number }[] = [];
  const restants: Record<string, number> = {};
  groupeIds.forEach(id => restants[id] = capaciteDe(id));

  for (const c of classes) {
    let file = [...parClasse[c]];
    for (const gId of groupeIds) {
      let cap = restants[gId];
      while (cap > 0 && file.length > 0) {
        placements.push({ groupeId: gId, matricule: file.shift()!.matricule });
        cap--;
        restants[gId]--;
      }
      if (file.length === 0) break;
    }
    // Overflow : si la classe est trop grosse pour un groupe, on étale sur les suivants
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

// Classes dispersées : round-robin par classe (chaque élève d'une classe va dans un groupe différent tant que possible)
function dispatcherDispersees(pool: any[], groupeIds: string[], capaciteDe: (id: string) => number) {
  const parClasse: Record<string, any[]> = {};
  pool.forEach(e => {
    const c = e.classe || '—';
    if (!parClasse[c]) parClasse[c] = [];
    parClasse[c].push(e);
  });
  // Mélange à l'intérieur de chaque classe pour ne pas envoyer toujours les mêmes élèves dans les mêmes groupes
  Object.keys(parClasse).forEach(c => parClasse[c] = shuffle(parClasse[c]));

  const placements: { groupeId: string; matricule: number }[] = [];
  const restants: Record<string, number> = {};
  groupeIds.forEach(id => restants[id] = capaciteDe(id));

  // Curseur de départ aléatoire par classe pour éviter un biais systématique
  for (const c of Object.keys(parClasse).sort((a, b) => parClasse[b].length - parClasse[a].length)) {
    const file = parClasse[c];
    const start = Math.floor(Math.random() * groupeIds.length);
    let i = 0;
    while (i < file.length) {
      const gId = groupeIds[(start + i) % groupeIds.length];
      if (restants[gId] > 0) {
        placements.push({ groupeId: gId, matricule: file[i].matricule });
        restants[gId]--;
        i++;
      } else {
        // Essaie un autre groupe
        let placed = false;
        for (const alt of groupeIds) {
          if (restants[alt] > 0) {
            placements.push({ groupeId: alt, matricule: file[i].matricule });
            restants[alt]--;
            i++;
            placed = true;
            break;
          }
        }
        if (!placed) break;
      }
    }
  }
  return placements;
}

// ---- Assignation automatique des profs (job='prof') qui ont cours le mardi ----

export async function assignerProfsAuto(params: {
  phaseId: string;
  anneeScolaire: string;
  heureMax?: string; // seuil texte, défaut '12h40' (= fin de la 6e heure)
}): Promise<{ profsPlaces: number; profsIgnores: number; profsEligibles: number }> {
  const { phaseId, anneeScolaire, heureMax = '12h40' } = params;

  // 1. Groupes triés par local (étage → id numérique)
  const ORDRE: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '6': 6, 'Annexe': 7 };
  const { data: groupes, error: gErr } = await supabase
    .from('conseil_lutte_groupes')
    .select(`id, nom, localisation_fixe (id, etage)`)
    .eq('phase_id', phaseId);
  if (gErr) throw gErr;
  if (!groupes || groupes.length === 0) throw new Error('Aucun groupe.');

  const groupesTries = [...groupes].sort((a: any, b: any) => {
    const la = Array.isArray(a.localisation_fixe) ? a.localisation_fixe[0] : a.localisation_fixe;
    const lb = Array.isArray(b.localisation_fixe) ? b.localisation_fixe[0] : b.localisation_fixe;
    const ea = la ? (ORDRE[la.etage] ?? 99) : 99;
    const eb = lb ? (ORDRE[lb.etage] ?? 99) : 99;
    if (ea !== eb) return ea - eb;
    return (la?.id || '').localeCompare(lb?.id || '', undefined, { numeric: true });
  });

  // 2. Charger TOUS les cours du mardi (pagination obligatoire)
  const courses: any[] = [];
  let from = 0;
  const PAGE = 500;
  while (true) {
    const { data, error } = await supabase
      .from('courses')
      .select('prof, heure_debut')
      .eq('annee_scolaire', anneeScolaire)
      .eq('jour', 'mardi')
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

  // 3. Filtrer heure_debut < seuil + déplier le tableau JSON de profs
  const profsAvecCoursMardi = new Set<string>();
  for (const c of courses) {
    if (!c.heure_debut || c.heure_debut >= heureMax) continue;
    let ids: any[] = [];
    try { ids = JSON.parse(c.prof); } catch { continue; }
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      if (typeof id === 'string' && id.length > 0) profsAvecCoursMardi.add(id);
    }
  }

  if (profsAvecCoursMardi.size === 0) {
    return { profsPlaces: 0, profsIgnores: 0, profsEligibles: 0 };
  }

  // 4. Employees avec job='prof' ET présents dans cet ensemble
  const { data: profs, error: pErr } = await supabase
    .from('employees')
    .select('id, nom, prenom')
    .eq('job', 'prof')
    .in('id', Array.from(profsAvecCoursMardi));
  if (pErr) throw pErr;

  const eligibles = profs || [];
  if (eligibles.length === 0) {
    return { profsPlaces: 0, profsIgnores: 0, profsEligibles: 0 };
  }

  // 5. Retirer ceux déjà affectés dans cette phase (préserver le manuel)
  const { data: dejaAffectesData, error: dErr } = await supabase
    .from('conseil_lutte_membres')
    .select('participant_id')
    .in('groupe_id', groupesTries.map((g: any) => g.id))
    .eq('participant_type', 'employee');
  if (dErr) throw dErr;
  const dejaAffectes = new Set((dejaAffectesData || []).map(m => m.participant_id));

  const aPlacer = eligibles.filter(p => !dejaAffectes.has(p.id));
  const profsIgnores = eligibles.length - aPlacer.length;

  // 6. Shuffle
  const shuffled = [...aPlacer].sort(() => Math.random() - 0.5);

  // 7. Distribution : on tourne en boucle sur les groupes (ordre étage → numéro)
  //    jusqu'à ce que tous les profs soient placés.
  const placements: any[] = [];
  let idxGroupe = 0;
  for (const prof of shuffled) {
    const g = groupesTries[idxGroupe % groupesTries.length];
    placements.push({
      groupe_id: (g as any).id,
      participant_id: prof.id,
      participant_type: 'employee',
      manuel: false,
    });
    idxGroupe++;
  }

  // 8. Insertion par chunks
  if (placements.length > 0) {
    const CHUNK = 200;
    for (let i = 0; i < placements.length; i += CHUNK) {
      const { error } = await supabase
        .from('conseil_lutte_membres')
        .insert(placements.slice(i, i + CHUNK));
      if (error) throw error;
    }
  }

  return {
    profsPlaces: placements.length,
    profsIgnores,
    profsEligibles: eligibles.length,
  };
}