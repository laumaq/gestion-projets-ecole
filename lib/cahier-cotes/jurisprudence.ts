import { Cote, Evaluation, EvaluationResultat } from './types';

export interface JurisprudenceResult {
  deduced: Array<{
    eleveMatricule: number;
    competenceCode: string;
    cote: Cote;
    reason: 'homogene' | 'jurisprudence';
    referenceEleves: number[];
  }>;
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
 * Ne conserve que les évals de cette compétence, dans l'ordre des évals données.
 * Retourne null pour les évals où l'élève n'a pas de cote.
 */
export function buildPattern(
  eleveMatricule: number,
  competenceCode: string,
  evaluations: Evaluation[],
  resultatsMap: Map<string, EvaluationResultat>
): (Cote | null)[] {
  const compKey = competenceCode.toLowerCase() as keyof EvaluationResultat;

  const out: (Cote | null)[] = [];
  for (const ev of evaluations) {
    if (!ev.competences.includes(competenceCode)) continue;
    const res = resultatsMap.get(`${ev.id}::${eleveMatricule}`);
    out.push(res ? (res[compKey] as Cote) : null);
  }
  return out;
}

/**
 * Analyse un pattern de cotes (avec null pour non-évalué).
 * - Ignore les null.
 * - Retourne :
 *   - 'empty' si aucune cote
 *   - 'homogene' si une seule cote unique
 *   - 'mixed' sinon, avec la liste des cotes non-null
 */
function analysePattern(pattern: (Cote | null)[]): {
  status: 'empty' | 'homogene' | 'mixed';
  cotes: Cote[];
  uniqueCote: Cote | null;
} {
  const cotes = pattern.filter((c): c is Cote => c !== null && c !== undefined);

  if (cotes.length === 0) {
    return { status: 'empty', cotes: [], uniqueCote: null };
  }

  const unique = new Set(cotes);
  if (unique.size === 1) {
    return { status: 'homogene', cotes, uniqueCote: cotes[0] };
  }

  return { status: 'mixed', cotes, uniqueCote: null };
}

/**
 * Sérialise un pattern pour comparaison.
 */
function serializePattern(pattern: (Cote | null)[]): string {
  return pattern.map(c => c ?? '∅').join('|');
}

/**
 * Calcule toutes les jurisprudences et homogénéités.
 *
 * Règles :
 * 1. Un élève dont toutes les cotes d'une compétence sont identiques
 *    (même s'il n'a qu'une seule éval) → pré-remplir sa cote de période.
 * 2. Si plusieurs élèves ont un pattern identique (non-homogène) et qu'un
 *    d'entre eux a une cote de période déjà remplie, pré-remplir les autres.
 * 3. Ne jamais écraser une cote déjà remplie. Générer un warning si elle
 *    diffère de la suggestion.
 */
export function computeAllJurisprudences(params: {
  evaluations: Evaluation[];
  resultats: EvaluationResultat[];
  elevesMatricules: number[];
  competencesCodes: string[];
  itineraireActuel: Map<string, Cote>;
}): JurisprudenceResult {
  const {
    evaluations,
    resultats,
    elevesMatricules,
    competencesCodes,
    itineraireActuel,
  } = params;

  const resultatsMap = new Map<string, EvaluationResultat>();
  resultats.forEach(r =>
    resultatsMap.set(`${r.evaluation_id}::${r.eleve_matricule}`, r)
  );

  const deduced: JurisprudenceResult['deduced'] = [];
  const warnings: JurisprudenceResult['warnings'] = [];

  for (const compCode of competencesCodes) {
    // Évals qui évaluent cette compétence
    const evalsComp = evaluations.filter(ev =>
      ev.competences.includes(compCode)
    );
    if (evalsComp.length === 0) continue;

    // Construire les patterns de chaque élève
    const elevesPatterns = elevesMatricules.map(mat => ({
      matricule: mat,
      pattern: buildPattern(mat, compCode, evalsComp, resultatsMap),
    }));

    // ─── Étape 1 : homogénéité par élève ───
    for (const e of elevesPatterns) {
      const analyse = analysePattern(e.pattern);
      if (analyse.status !== 'homogene') continue;

      const cleItineraire = `${e.matricule}::${compCode}`;
      const coteActuelle = itineraireActuel.get(cleItineraire) ?? null;

      if (coteActuelle === null) {
        // À pré-remplir
        deduced.push({
          eleveMatricule: e.matricule,
          competenceCode: compCode,
          cote: analyse.uniqueCote,
          reason: 'homogene',
          referenceEleves: [e.matricule],
        });
      } else if (coteActuelle !== analyse.uniqueCote) {
        warnings.push({
          eleveMatricule: e.matricule,
          competenceCode: compCode,
          coteActuelle,
          coteSuggeree: analyse.uniqueCote,
          pattern: serializePattern(e.pattern),
        });
      }
    }

    // ─── Étape 2 : jurisprudence sur patterns identiques non-homogènes ───
    // Grouper les élèves par pattern sérialisé
    const groupes = new Map<string, typeof elevesPatterns>();
    for (const e of elevesPatterns) {
      const analyse = analysePattern(e.pattern);
      if (analyse.status !== 'mixed') continue; // on ne traite que le mixed ici
      const key = serializePattern(e.pattern);
      if (!groupes.has(key)) groupes.set(key, []);
      groupes.get(key)!.push(e);
    }

    // Pour chaque groupe, chercher une cote de période de référence
    for (const [patternKey, groupe] of groupes) {
      // Récupérer les cotes de période déjà remplies
      const cotesRemplies = groupe
        .map(g => ({
          matricule: g.matricule,
          cote: itineraireActuel.get(`${g.matricule}::${compCode}`) ?? null,
        }))
        .filter(x => x.cote !== null);

      if (cotesRemplies.length === 0) continue;

      const cotesDistinctes = new Set(cotesRemplies.map(c => c.cote));
      if (cotesDistinctes.size > 1) {
        // Conflit : plusieurs élèves du même groupe ont des cotes différentes
        // On ne pré-remplit rien, pas de warning (ambigu)
        continue;
      }

      const coteReference = cotesRemplies[0].cote;
      const referenceEleves = cotesRemplies.map(c => c.matricule);

      // Pré-remplir les autres élèves du groupe
      for (const e of groupe) {
        const cle = `${e.matricule}::${compCode}`;
        const coteActuelle = itineraireActuel.get(cle) ?? null;

        // Skip les élèves déjà référencés (qui ont servi de référence)
        if (referenceEleves.includes(e.matricule)) continue;

        if (coteActuelle === null) {
          deduced.push({
            eleveMatricule: e.matricule,
            competenceCode: compCode,
            cote: coteReference,
            reason: 'jurisprudence',
            referenceEleves,
          });
        } else if (coteActuelle !== coteReference) {
          warnings.push({
            eleveMatricule: e.matricule,
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

/**
 * Propage une cote modifiée manuellement aux autres élèves ayant le même pattern.
 * Ne s'applique QU'À la compétence, la période et l'année scolaire en cours.
 * N'écrase JAMAIS une cote déjà remplie.
 *
 * Retourne la liste des élèves dont la cote a été pré-remplie.
 */
export function propagerJurisprudence(params: {
  evaluations: Evaluation[];
  resultats: EvaluationResultat[];
  elevesMatricules: number[];
  competenceCode: string;
  matriculeSource: number;
  nouvelleCote: Cote;
  itineraireActuel: Map<string, Cote>;
}): Array<{
  eleveMatricule: number;
  competenceCode: string;
  cote: Cote;
}> {
  const {
    evaluations,
    resultats,
    elevesMatricules,
    competenceCode,
    matriculeSource,
    nouvelleCote,
    itineraireActuel,
  } = params;

  if (nouvelleCote === null) return [];

  const resultatsMap = new Map<string, EvaluationResultat>();
  resultats.forEach(r =>
    resultatsMap.set(`${r.evaluation_id}::${r.eleve_matricule}`, r)
  );

  // Évals qui évaluent cette compétence
  const evalsComp = evaluations.filter(ev =>
    ev.competences.includes(competenceCode)
  );
  if (evalsComp.length === 0) return [];

  // Pattern de l'élève source
  const sourcePattern = buildPattern(
    matriculeSource,
    competenceCode,
    evalsComp,
    resultatsMap
  );
  const sourcePatternKey = serializePattern(sourcePattern);

  // Analyser : on ne propage QUE si le pattern est "mixed" (non-homogène)
  // (si homogène, c'est géré par le bouton global)
  const sourceAnalyse = analysePattern(sourcePattern);
  if (sourceAnalyse.status !== 'mixed') return [];

  const aPropager: Array<{
    eleveMatricule: number;
    competenceCode: string;
    cote: Cote;
  }> = [];

  for (const mat of elevesMatricules) {
    if (mat === matriculeSource) continue;

    const pattern = buildPattern(mat, competenceCode, evalsComp, resultatsMap);
    if (serializePattern(pattern) !== sourcePatternKey) continue;

    // Ne pas écraser une cote existante
    const coteActuelle = itineraireActuel.get(`${mat}::${competenceCode}`) ?? null;
    if (coteActuelle !== null) continue;

    aPropager.push({
      eleveMatricule: mat,
      competenceCode,
      cote: nouvelleCote,
    });
  }

  return aPropager;
}

