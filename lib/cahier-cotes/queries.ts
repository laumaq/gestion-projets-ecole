import { supabase } from '@/lib/supabase';
import {
  CahierCotesData,
  CoursLogique,
  Eleve,
  Evaluation,
  EvaluationResultat,
  MatiereCompetence,
  Periode,
} from './types';

const MATIERES_EXCLUES = ['Conseil de la classe', 'Conseil de classe'];

/**
 * Récupère tous les cours logiques d'un prof pour une année scolaire
 */
export async function getCoursLogiquesForTeacher(
  employeeId: string,
  anneeScolaire: string
): Promise<CoursLogique[]> {
  console.log('🌐 getCoursLogiquesForTeacher appelée');
  console.log('   employeeId:', employeeId);
  console.log('   anneeScolaire:', anneeScolaire);

  // 1. Récupérer les IDs via la vue matérialisée
  const { data: vData, error: vError } = await supabase
    .from('v_course_teachers')
    .select('cours_logique_id')
    .eq('employee_id', employeeId)
    .eq('annee_scolaire', anneeScolaire);
  
  console.log('   vData:', vData);
  console.log('   vError:', vError);
  
  if (vError) throw vError;

  const ids = (vData ?? []).map(r => r.cours_logique_id);
  console.log('   ids extraits:', ids);
  
  if (ids.length === 0) {
    console.log('   → 0 ids, on retourne []');
    return [];
  }

  // 2. Détails
  const { data, error } = await supabase
    .from('cours_logiques')
    .select('*')
    .in('id', ids)
    .order('matiere');
  
  console.log('   cours_logiques data:', data);
  console.log('   cours_logiques error:', error);
  
  if (error) throw error;

  const filtered = (data ?? []).filter(cl => !MATIERES_EXCLUES.includes(cl.matiere));
  console.log('   après filtre MATIERES_EXCLUES:', filtered);
  console.log('   MATIERES_EXCLUES:', MATIERES_EXCLUES);

  return filtered;
}

/**
 * Récupère les élèves d'un cours logique via son groupe pédagogique
 */
export async function getElevesForCoursLogique(
  coursLogique: CoursLogique
): Promise<Eleve[]> {
  // 1. Récupérer les matricules du groupe
  const { data: sg, error: e1 } = await supabase
    .from('students_groups')
    .select('matricule')
    .eq('groupe_code', coursLogique.groupe_pedagogique);
  if (e1) throw e1;

  const matricules = (sg ?? []).map(s => s.matricule);
  if (matricules.length === 0) return [];

  // 2. Récupérer les élèves
  const { data, error } = await supabase
    .from('students')
    .select('matricule, nom, prenom, classe')
    .in('matricule', matricules);
  if (error) throw error;

  // 3. Trier par classe > nom > prénom
  return (data ?? []).sort((a, b) => {
    if (a.classe !== b.classe) return a.classe.localeCompare(b.classe);
    if (a.nom !== b.nom) return a.nom.localeCompare(b.nom);
    return a.prenom.localeCompare(b.prenom);
  });
}

/**
 * Récupère les compétences associées à la matière du cours logique
 */
export async function getCompetencesForCoursLogique(
  coursLogique: CoursLogique
): Promise<MatiereCompetence[]> {
  const { data, error } = await supabase
    .from('matiere_competences')
    .select('*')
    .eq('matiere', coursLogique.matiere)
    .order('ordre');
  if (error) throw error;
  return data ?? [];
}

/**
 * Récupère les évaluations d'un cours logique pour une période
 */
export async function getEvaluations(
  coursLogiqueId: string,
  periode: Periode,
  anneeScolaire: string
): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('cours_logique_id', coursLogiqueId)
    .eq('periode', periode)
    .eq('annee_scolaire', anneeScolaire)
    .order('date_eval');
  if (error) throw error;
  return data ?? [];
}

/**
 * Récupère tous les résultats pour une liste d'évaluations
 */
export async function getResultatsForEvaluations(
  evaluationIds: string[]
): Promise<EvaluationResultat[]> {
  if (evaluationIds.length === 0) return [];
  const { data, error } = await supabase
    .from('evaluation_resultats')
    .select('*')
    .in('evaluation_id', evaluationIds);
  if (error) throw error;
  return data ?? [];
}

/**
 * Charge tout le cahier de cotes
 */
export async function loadCahierCotes(
  coursLogiqueId: string,
  periode: Periode,
  anneeScolaire: string
): Promise<CahierCotesData> {
  const { data: coursLogique, error: clError } = await supabase
    .from('cours_logiques')
    .select('*')
    .eq('id', coursLogiqueId)
    .single();
  if (clError) throw clError;

  const [competences, eleves, evaluations] = await Promise.all([
    getCompetencesForCoursLogique(coursLogique),
    getElevesForCoursLogique(coursLogique),
    getEvaluations(coursLogiqueId, periode, anneeScolaire),
  ]);

  const resultats = await getResultatsForEvaluations(evaluations.map(e => e.id));

  return { coursLogique, eleves, evaluations, resultats, competences };
}

/**
 * Crée une évaluation + les lignes de résultats vides
 */
export async function createEvaluation(params: {
  coursLogiqueId: string;
  periode: Periode;
  anneeScolaire: string;
  nom: string;
  dateEval: string;
  competences: string[];
  eleveMatricules: number[];
  createdBy: string;
}): Promise<Evaluation> {
  const { data: evaluation, error: evalError } = await supabase
    .from('evaluations')
    .insert({
      cours_logique_id: params.coursLogiqueId,
      periode: params.periode,
      annee_scolaire: params.anneeScolaire,
      nom: params.nom,
      date_eval: params.dateEval,
      competences: params.competences,
      created_by: params.createdBy,
    })
    .select()
    .single();
  if (evalError) throw evalError;

  const resultats = params.eleveMatricules.map(matricule => ({
    evaluation_id: evaluation.id,
    eleve_matricule: matricule,
  }));

  const { error: resError } = await supabase
    .from('evaluation_resultats')
    .insert(resultats);
  if (resError) throw resError;

  return evaluation;
}

/**
 * Met à jour une note
 */
export async function updateCote(params: {
  evaluationId: string;
  eleveMatricule: number;
  competenceCode: string;
  cote: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('evaluation_resultats')
    .update({ [params.competenceCode.toLowerCase()]: params.cote })
    .eq('evaluation_id', params.evaluationId)
    .eq('eleve_matricule', params.eleveMatricule);
  if (error) throw error;
}

/**
 * Met à jour le nom/date d'une évaluation
 */
export async function updateEvaluation(
  evaluationId: string,
  updates: Partial<Pick<Evaluation, 'nom' | 'date_eval'>>
): Promise<void> {
  const { error } = await supabase
    .from('evaluations')
    .update(updates)
    .eq('id', evaluationId);
  if (error) throw error;
}

/**
 * Supprime une évaluation
 */
export async function deleteEvaluation(evaluationId: string): Promise<void> {
  const { error } = await supabase
    .from('evaluations')
    .delete()
    .eq('id', evaluationId);
  if (error) throw error;
}

/**
 * Récupère l'itinéraire d'une période pour un cours logique
 */
export async function getItineraireForPeriod(
  coursLogiqueId: string,
  periode: Periode,
  anneeScolaire: string
) {
  const { data, error } = await supabase
    .from('itineraire_periodes')
    .select('*')
    .eq('cours_logique_id', coursLogiqueId)
    .eq('periode', periode)
    .eq('annee_scolaire', anneeScolaire);
  if (error) throw error;
  return data ?? [];
}

/**
 * Upsert d'une cote d'itinéraire
 */
export async function upsertItineraireCote(params: {
  eleveMatricule: number;
  coursLogiqueId: string;
  periode: Periode;
  anneeScolaire: string;
  competenceCode: string;
  cote: string | null;
  updatedBy: string;
  isManuel?: boolean;
  isJurisprudence?: boolean;
}): Promise<void> {
  const compKey = params.competenceCode.toLowerCase();

  const { data: existing } = await supabase
    .from('itineraire_periodes')
    .select('id')
    .eq('eleve_matricule', params.eleveMatricule)
    .eq('cours_logique_id', params.coursLogiqueId)
    .eq('periode', params.periode)
    .eq('annee_scolaire', params.anneeScolaire)
    .maybeSingle();

  if (existing) {
    const update: any = {
      [compKey]: params.cote,
      updated_by: params.updatedBy,
      updated_at: new Date().toISOString(),
    };
    if (params.isManuel !== undefined) update.is_manuel = params.isManuel;
    if (params.isJurisprudence !== undefined) update.is_jurisprudence = params.isJurisprudence;

    const { error } = await supabase
      .from('itineraire_periodes')
      .update(update)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const insert: any = {
      eleve_matricule: params.eleveMatricule,
      cours_logique_id: params.coursLogiqueId,
      periode: params.periode,
      annee_scolaire: params.anneeScolaire,
      [compKey]: params.cote,
      updated_by: params.updatedBy,
      is_manuel: params.isManuel ?? false,
      is_jurisprudence: params.isJurisprudence ?? false,
    };
    const { error } = await supabase
      .from('itineraire_periodes')
      .insert(insert);
    if (error) throw error;
  }
}