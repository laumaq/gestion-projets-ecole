export type Periode = 'P1' | 'P2' | 'P3';

export type Cote = 'NA' | 'EC-' | 'EC' | 'EC+' | 'A' | 'CM' | 'X' | null;

export const COTES_VALIDES: Cote[] = ['NA', 'EC-', 'EC', 'EC+', 'A', 'CM', 'X', null];

export interface MatiereCompetence {
  id: string;
  matiere: string;
  code: string;
  libelle: string;
  ordre: number;
}

export interface CoursLogique {
  id: string;
  matiere: string;
  groupe_pedagogique: string;
  nom_affichage: string | null;
  annee_scolaire: string;
  created_at: string;
}

export interface Evaluation {
  id: string;
  cours_logique_id: string;    // ⭐ changé
  periode: Periode;
  annee_scolaire: string;
  nom: string;
  date_eval: string;
  created_by: string;
  created_at: string;
  competences: string[];
  visible_eleves: boolean;
  notes: string | null;
}

export interface EvaluationResultat {
  id: string;
  evaluation_id: string;
  eleve_matricule: number;
  c1: Cote; c2: Cote; c3: Cote; c4: Cote; c5: Cote;
  c6: Cote; c7: Cote; c8: Cote; c9: Cote; c10: Cote;
  updated_at: string;
}

export interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
}

export interface CahierCotesData {
  coursLogique: CoursLogique;
  eleves: Eleve[];
  evaluations: Evaluation[];
  resultats: EvaluationResultat[];
  competences: MatiereCompetence[];
}