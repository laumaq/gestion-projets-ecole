// app/tools/mon-horaire/types.ts

export interface Cours {
  cours_id: number;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  prof: string;
  matiere: string;
  salle: string;
  type_pattern: string;
  raw_pattern: string;
}

export interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string | null;
}

export type VueType = 'jour' | 'semaine';