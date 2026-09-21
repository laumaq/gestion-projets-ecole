// app/tools/tfh/coordination/utils/dashboardStats.ts
import { Eleve } from '../types';
import { Journee, Session } from './sessionUtils';

// ============================================================
// Bloc 1 — Répartition par type
// ============================================================
export interface TypeRepartition {
  key: string;         // 'traditionnel', 'stage', 'atelier', 'chefdoeuvre', 'non_defini'
  label: string;       // Label affichable
  count: number;
  pourcentage: number;
  color: string;       // Classes Tailwind (bg + text + border)
}

export function calculerRepartitionTypes(
  eleves: Eleve[],
  types: Array<{ key: string; label: string; color: string }>
): TypeRepartition[] {
  const total = eleves.length;
  if (total === 0) return [];

  // Compter par type
  const counts: Record<string, number> = {};
  eleves.forEach(e => {
    const key = e.type && e.type.trim() !== '' ? e.type : 'non_defini';
    counts[key] = (counts[key] || 0) + 1;
  });

  // Mapper sur les types connus
  const result: TypeRepartition[] = types.map(t => ({
    key: t.key,
    label: t.label,
    count: counts[t.key] || 0,
    pourcentage: total > 0 ? Math.round(((counts[t.key] || 0) / total) * 1000) / 10 : 0,
    color: t.color,
  }));

  // Ajouter "Non défini" si présent
  if (counts['non_defini']) {
    result.push({
      key: 'non_defini',
      label: 'Non défini',
      count: counts['non_defini'],
      pourcentage: Math.round((counts['non_defini'] / total) * 1000) / 10,
      color: 'bg-gray-100 text-gray-700 border-gray-200',
    });
  }

  return result;
}

// ============================================================
// Bloc 2 — Stats phase préparatoire
// ============================================================
export interface PrepStats {
  thematiqueRemplie: { count: number; total: number; pourcentage: number };
  problematiqueRemplie: { count: number; total: number; pourcentage: number };
  sourcesRemplies: { count: number; total: number; pourcentage: number };
}

export function calculerPrepStats(eleves: Eleve[]): PrepStats {
  const total = eleves.length;
  if (total === 0) {
    return {
      thematiqueRemplie: { count: 0, total: 0, pourcentage: 0 },
      problematiqueRemplie: { count: 0, total: 0, pourcentage: 0 },
      sourcesRemplies: { count: 0, total: 0, pourcentage: 0 },
    };
  }

  const thematiqueRemplie = eleves.filter(e => e.thematique && e.thematique.trim() !== '').length;
  const problematiqueRemplie = eleves.filter(e => e.problematique && e.problematique.trim() !== '').length;
  const sourcesRemplies = eleves.filter(e => {
    return [e.source_1, e.source_2, e.source_3, e.source_4, e.source_5]
      .every(s => s && s.trim() !== '');
  }).length;

  return {
    thematiqueRemplie: {
      count: thematiqueRemplie,
      total,
      pourcentage: Math.round((thematiqueRemplie / total) * 100),
    },
    problematiqueRemplie: {
      count: problematiqueRemplie,
      total,
      pourcentage: Math.round((problematiqueRemplie / total) * 100),
    },
    sourcesRemplies: {
      count: sourcesRemplies,
      total,
      pourcentage: Math.round((sourcesRemplies / total) * 100),
    },
  };
}

// ============================================================
// Bloc 3 — Stats phase normale
// ============================================================

// a) % traditionnels avec guide
export function calculerGuidesTradi(eleves: Eleve[]): { count: number; total: number; pourcentage: number } {
  const tradi = eleves.filter(e => e.type === 'traditionnel');
  const avecGuide = tradi.filter(e => e.guide_id && e.guide_id.trim() !== '');
  return {
    count: avecGuide.length,
    total: tradi.length,
    pourcentage: tradi.length > 0 ? Math.round((avecGuide.length / tradi.length) * 100) : 0,
  };
}

// d) % TFH avec défense établie (date + heure + local)
export function calculerDefensesEtablies(eleves: Eleve[]): { count: number; total: number; pourcentage: number } {
  const total = eleves.length;
  const etablies = eleves.filter(e =>
    e.date_defense && e.date_defense.trim() !== '' &&
    e.heure_defense && e.heure_defense.trim() !== '' &&
    e.localisation_defense && e.localisation_defense.trim() !== ''
  );
  return {
    count: etablies.length,
    total,
    pourcentage: total > 0 ? Math.round((etablies.length / total) * 100) : 0,
  };
}

// e, f, g) Lecteur externe / Médiateur / Ni l'un ni l'autre
export function calculerLecteursEtMediateurs(eleves: Eleve[]) {
  const total = eleves.length;
  const avecLecteurExterne = eleves.filter(e => e.lecteur_externe_id && e.lecteur_externe_id.trim() !== '').length;
  const avecMediateur = eleves.filter(e => e.mediateur_id && e.mediateur_id.trim() !== '').length;
  const sansAucun = eleves.filter(e =>
    (!e.lecteur_externe_id || e.lecteur_externe_id.trim() === '') &&
    (!e.mediateur_id || e.mediateur_id.trim() === '')
  ).length;

  return {
    lecteurExterne: {
      count: avecLecteurExterne,
      total,
      pourcentage: total > 0 ? Math.round((avecLecteurExterne / total) * 100) : 0,
    },
    mediateur: {
      count: avecMediateur,
      total,
      pourcentage: total > 0 ? Math.round((avecMediateur / total) * 100) : 0,
    },
    sansAucun: {
      count: sansAucun,
      total,
      pourcentage: total > 0 ? Math.round((sansAucun / total) * 100) : 0,
    },
  };
}

// c) Nombre de convoqués à la prochaine session
export function calculerConvoquesProchaineSession(
  eleves: Eleve[],
  sessions: Session[]
): { count: number; total: number; sessionNom: string | null } {
  const now = new Date();
  // Prochaine session = première session dont date_fin >= aujourd'hui
  const prochaineSession = sessions.find(s => s.date_fin >= now);

  if (!prochaineSession) {
    return { count: 0, total: 0, sessionNom: null };
  }

  const sessionNum = parseInt(prochaineSession.id.split('_')[1]);
  const key = `session_${sessionNum}_convoque` as keyof Eleve;

  const convoques = eleves.filter(e => {
    const val = e[key] as string | undefined;
    return val?.startsWith('Oui') === true;
  });

  return {
    count: convoques.length,
    total: eleves.length,
    sessionNom: prochaineSession.nom,
  };
}

// h) Proportion d'élèves dont la convocation est remplie pour la prochaine session
export function calculerConvocationsRemplies(
  eleves: Eleve[],
  sessions: Session[]
): { count: number; total: number; pourcentage: number; sessionNom: string | null } {
  const now = new Date();
  const prochaineSession = sessions.find(s => s.date_fin >= now);

  if (!prochaineSession) {
    return { count: 0, total: 0, pourcentage: 0, sessionNom: null };
  }

  const sessionNum = parseInt(prochaineSession.id.split('_')[1]);
  const key = `session_${sessionNum}_convoque` as keyof Eleve;

  const remplies = eleves.filter(e => {
    const val = e[key] as string | undefined;
    return val && val.trim() !== '';
  });

  return {
    count: remplies.length,
    total: eleves.length,
    pourcentage: eleves.length > 0 ? Math.round((remplies.length / eleves.length) * 100) : 0,
    sessionNom: prochaineSession.nom,
  };
}

// i) % employees ayant ≥ 1 TFH comme guide
// j) % employees ayant ≥ 1 TFH comme lecteur interne
export function calculerImplicationEmployees(
  eleves: Eleve[],
  allEmployees: Array<{ id: string; job: string }>
) {
  const total = allEmployees.length;
  if (total === 0) {
    return {
      guides: { count: 0, total: 0, pourcentage: 0 },
      lecteursInternes: { count: 0, total: 0, pourcentage: 0 },
    };
  }

  const guidesIds = new Set(
    eleves
      .filter(e => e.guide_id && e.guide_id.trim() !== '')
      .map(e => e.guide_id)
  );
  const lecteursInternesIds = new Set(
    eleves
      .filter(e => e.lecteur_interne_id && e.lecteur_interne_id.trim() !== '')
      .map(e => e.lecteur_interne_id)
  );

  const countGuides = allEmployees.filter(emp => guidesIds.has(emp.id)).length;
  const countLecteurs = allEmployees.filter(emp => lecteursInternesIds.has(emp.id)).length;

  return {
    guides: {
      count: countGuides,
      total,
      pourcentage: Math.round((countGuides / total) * 100),
    },
    lecteursInternes: {
      count: countLecteurs,
      total,
      pourcentage: Math.round((countLecteurs / total) * 100),
    },
  };
}