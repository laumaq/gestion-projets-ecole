import { Cote, Evaluation, EvaluationResultat } from './types';

export interface PatternInfo {
  eleveMatricule: number;
  // Pattern complet de cotes sur les évals de la compétence (dans l'ordre des évals)
  // Ex: ['EC', 'A', 'EC'] ou ['NA', 'EC', null] (null = pas encore noté)
  pattern: (Cote | null)[];
}

export interface JurisprudenceResult {
  // Élèves dont on peut déduire la cote de période
  deduced: Array<{
    eleveMatricule: number;
    competenceCode: string;
    cote: Cote;
    reason: 'homogene' | 'jurisprudence';
    referenceEleves: number[]; // autres élèves avec le même pattern
  }>;
  // Warnings : élèves dont la cote déjà remplie diffère du pattern majoritaire
  warnings: Array<{
    eleveMatricule: number;
    competenceCode: string;
    coteActuelle: Cote;
    coteSuggeree: Cote;
    pattern: string;
  }>;
}

/**
 * Construit le pattern complet de cotes pour un élève sur une compétence donnée.
 * Les évaluations sont triées par date_eval.
 * Retourne null pour les évals non notées (à ignorer dans la comparaison).
 */
export function buildPattern(
  eleveMatricule: number,
  competenceCode: string,
  evaluations: Evaluation[],
  resultatsMap: Map<string, EvaluationResultat>
): (Cote | null)[] {
  const compKey = competenceCode.toLowerCase() as keyof EvaluationResultat;

  return evaluations.map(ev => {
    // L'élève n'a peut-être pas cette compétence dans cette éval
    if (!ev.competences.includes(competenceCode)) return undefined as any;

    const res = resultatsMap.get(`${ev.id}::${eleveMatricule}`);
    if (!res) return null;

    return res[compKey] as Cote;
  }).filter(v => v !== undefined);
}

/**
 * Vérifie si tous les patterns sont identiques.
 * Ignore les null (élèves non notés à certaines évals).
 * Retourne la cote commune ou null si patterns différents.
 */
export function detectHomogene(patterns: (Cote | null)[][]): Cote | 'different' | null {
  if (patterns.length === 0) return null;

  // On filtre les null de chaque pattern pour ne comparer que les vraies valeurs
  const normalized = patterns.map(p => p.filter(v => v !== null && v !== undefined) as Cote[]);

  // Si aucun pattern n'a de valeurs, on ne peut rien déduire
  if (normalized.every(p => p.length === 0)) return null;

  // Si un élève n'a aucune cote et les autres en ont, on ne peut pas déduire
  // (il n'a pas passé les évals)
  if (normalized.some(p => p.length === 0)) return 'different';

  // On compare les tableaux de cotes (une fois les null filtrés)
  const first = normalized[0].join('|');
  const allSame = normalized.every(p => p.join('|') === first);

  if (!allSame) return 'different';

  // Pattern uniforme → on regarde si toutes les cotes sont identiques
  const cotesSet = new Set(normalized[0]);
  if (cotesSet.size === 1) {
    return normalized[0][0]; // Homogène
  }

  // Pattern non-uniforme mais identique entre élèves → jurisprudence
  return 'different'; // Sera traité par jurisprudence
}

/**
 * Calcule la cote de période selon l'algorithme principal.
 *
 * Règles :
 * 1. Si toutes les cotes sont identiques (ex: A,A,A) → c'est cette cote.
 * 2. Sinon, on cherche d'autres élèves avec le même pattern exact → jurisprudence.
 * 3. Sinon, on ne peut pas déduire (retourne null).
 */
export function computeJurisprudence(
  eleveMatricule: number,
  competenceCode: string,
  evaluations: Evaluation[],
  resultatsMap: Map<string, EvaluationResultat>,
  allElevesMatricules: number[],
  coteActuelle: Cote // cote déjà remplie manuellement (peut être null)
): {
  coteDeduite: Cote;
  reason: 'homogene' | 'jurisprudence' | null;
  referenceEleves: number[];
  warning: boolean;
} {
  // 1. Construire tous les patterns
  const patterns = allElevesMatricules.map(mat => ({
    matricule: mat,
    pattern: buildPattern(mat, competenceCode, evaluations, resultatsMap),
  }));

  // Filtrer les élèves qui ont au moins une cote (ont passé au moins une éval)
  const patternParEleve = patterns.filter(p => p.pattern.some(c => c !== null));

  if (patternParEleve.length === 0) {
    return { coteDeduite: null, reason: null, referenceEleves: [], warning: false };
  }

  // ─── Cas 1 : Homogénéité globale ───
  // On regarde si TOUTES les cotes de TOUS les élèves sur cette compétence sont identiques
  const toutesLesCotes = patternParEleve.flatMap(p => p.pattern.filter(c => c !== null));
  const cotesUniques = new Set(toutesLesCotes);

  if (cotesUniques.size === 1 && toutesLesCotes.length > 0) {
    const cote = toutesLesCotes[0];
    return {
      coteDeduite: cote,
      reason: 'homogene',
      referenceEleves: patternParEleve.map(p => p.matricule),
      warning: coteActuelle !== null && coteActuelle !== cote,
    };
  }

  // ─── Cas 2 : Jurisprudence ───
  // On cherche les élèves qui ont EXACTEMENT le même pattern que l'élève cible
  const monPattern = patternParEleve.find(p => p.matricule === eleveMatricule)?.pattern;
  if (!monPattern) {
    return { coteDeduite: null, reason: null, referenceEleves: [], warning: false };
  }

  // Sérialiser le pattern pour comparaison (ignore les null)
  const serializePattern = (p: (Cote | null)[]) =>
    p.map(c => c ?? '∅').join('|');

  const monPatternStr = serializePattern(monPattern);
  const elevesAvecMemePattern = patternParEleve.filter(p => {
    if (p.matricule === eleveMatricule) return false;
    return serializePattern(p.pattern) === monPatternStr;
  });

  if (elevesAvecMemePattern.length === 0) {
    // Pas d'autre élève avec le même pattern → on ne peut rien déduire
    return { coteDeduite: null, reason: null, referenceEleves: [], warning: false };
  }

  // On cherche la cote de période déjà remplie pour un des élèves de référence
  // (ou une cote déjà remplie par le prof quelque part sur cette compétence)
  // → on n'a pas accès ici aux itinéraires, donc on retourne juste l'info
  //   que d'autres élèves ont le même pattern.
  // C'est le composant appelant qui décidera en fonction de l'itinéraire existant.

  return {
    coteDeduite: null, // Sera déterminé par l'appelant en fonction des itinéraires
    reason: 'jurisprudence',
    referenceEleves: elevesAvecMemePattern.map(p => p.matricule),
    warning: false,
  };
}

/**
 * Algorithme global : parcourt toutes les compétences et tous les élèves,
 * et retourne les cotes à appliquer + les warnings.
 */
export function computeAllJurisprudences(params: {
  evaluations: Evaluation[];
  resultats: EvaluationResultat[];
  elevesMatricules: number[];
  competencesCodes: string[];
  itineraireActuel: Map<string, Cote>; // clé: `${matricule}::${competenceCode}`
}): JurisprudenceResult {
  const {
    evaluations,
    resultats,
    elevesMatricules,
    competencesCodes,
    itineraireActuel,
  } = params;

  const resultatsMap = new Map<string, EvaluationResultat>();
  resultats.forEach(r => resultatsMap.set(`${r.evaluation_id}::${r.eleve_matricule}`, r));

  const deduced: JurisprudenceResult['deduced'] = [];
  const warnings: JurisprudenceResult['warnings'] = [];

  for (const compCode of competencesCodes) {
    // Ne considérer que les évals qui évaluent cette compétence
    const evalsComp = evaluations.filter(ev => ev.competences.includes(compCode));

    // Construire les patterns
    const patterns = elevesMatricules.map(mat => ({
      matricule: mat,
      pattern: buildPattern(mat, compCode, evalsComp, resultatsMap),
    }));

    // Garder uniquement les élèves qui ont au moins une cote
    const elevesActifs = patterns.filter(p => p.pattern.some(c => c !== null));

    if (elevesActifs.length === 0) continue;

    // ─── Cas 1 : Homogénéité ───
    const toutesLesCotes = elevesActifs.flatMap(p => p.pattern.filter(c => c !== null));
    const cotesUniques = new Set(toutesLesCotes);

    let coteHomogene: Cote = null;
    if (cotesUniques.size === 1 && toutesLesCotes.length > 0) {
      coteHomogene = toutesLesCotes[0];
    }

    // Sérialisation pour jurisprudence
    const serializePattern = (p: (Cote | null)[]) =>
      p.map(c => c ?? '∅').join('|');

    // Grouper les élèves par pattern identique
    const groupes = new Map<string, typeof elevesActifs>();
    for (const e of elevesActifs) {
      const key = serializePattern(e.pattern);
      if (!groupes.has(key)) groupes.set(key, []);
      groupes.get(key)!.push(e);
    }

    // ─── Pour chaque élève ───
    for (const eleve of elevesActifs) {
      const cleItineraire = `${eleve.matricule}::${compCode}`;
      const coteActuelle = itineraireActuel.get(cleItineraire) ?? null;

      // Sous-cas A : homogénéité globale
      if (coteHomogene !== null) {
        if (coteActuelle === null) {
          deduced.push({
            eleveMatricule: eleve.matricule,
            competenceCode: compCode,
            cote: coteHomogene,
            reason: 'homogene',
            referenceEleves: elevesActifs.map(e => e.matricule),
          });
        } else if (coteActuelle !== coteHomogene) {
          warnings.push({
            eleveMatricule: eleve.matricule,
            competenceCode: compCode,
            coteActuelle,
            coteSuggeree: coteHomogene,
            pattern: serializePattern(eleve.pattern),
          });
        }
        continue;
      }

      // Sous-cas B : jurisprudence (pattern identique avec d'autres élèves)
      const patternKey = serializePattern(eleve.pattern);
      const groupe = groupes.get(patternKey) ?? [];

      // Il faut au moins 2 élèves avec le même pattern (dont lui)
      if (groupe.length < 2) continue;

      // Chercher dans le groupe une cote de période déjà remplie par un autre élève
      let coteReference: Cote = null;
      const elevesReference: number[] = [];

      for (const autre of groupe) {
        if (autre.matricule === eleve.matricule) continue;
        const autreCote = itineraireActuel.get(`${autre.matricule}::${compCode}`) ?? null;
        if (autreCote !== null) {
          coteReference = autreCote;
          elevesReference.push(autre.matricule);
        }
      }

      // Cas : plusieurs élèves avec le même pattern ont des cotes différentes → conflit
      const cotesRefSet = new Set(
        groupe
          .filter(a => a.matricule !== eleve.matricule)
          .map(a => itineraireActuel.get(`${a.matricule}::${compCode}`) ?? null)
          .filter(c => c !== null)
      );

      if (cotesRefSet.size > 1) {
        // Conflit : plusieurs cotes différentes parmi les références
        // On ne pré-remplit rien, on n'avertit pas non plus (trop ambigu)
        continue;
      }

      if (coteReference !== null) {
        // On a une cote de référence à appliquer
        if (coteActuelle === null) {
          deduced.push({
            eleveMatricule: eleve.matricule,
            competenceCode: compCode,
            cote: coteReference,
            reason: 'jurisprudence',
            referenceEleves: elevesReference,
          });
        } else if (coteActuelle !== coteReference) {
          warnings.push({
            eleveMatricule: eleve.matricule,
            competenceCode: compCode,
            coteActuelle,
            coteSuggeree: coteReference,
            pattern: patternKey,
          });
        }
      }
    }
  }

  return { deduced, warnings };
}