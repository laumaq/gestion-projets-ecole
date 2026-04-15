// app/tools/tfh/coordination/types/index.ts

// Élève - maintenant avec student_matricule comme clé primaire
export interface Eleve {
  id: number; // Changé: student_matricule (integer) au lieu de UUID string
  student_matricule: number;
  nom: string;      // Vient de students
  prenom: string;   // Vient de students
  classe: string;   // Vient de students
  mot_de_passe?: string | null;
  
  // Références vers employees (UUID strings)
  guide_id: string | null;
  lecteur_interne_id: string | null;
  mediateur_id: string | null;  // UUID vers tfh_mediateurs
  lecteur_externe_id: string | null; // UUID vers tfh_lecteurs_externes
  
  // Contenu du TFH
  problematique: string;
  categorie: string;
  thematique?: string;
  objectif_particulier?: string | null;
  
  // Sources
  source_1?: string;
  source_2?: string;
  source_3?: string;
  source_4?: string;
  source_5?: string;
  
  // Convocations (strings)
  convocation_mars: string;
  convocation_avril: string;
  
  // Sessions (1-20)
  session_1_convoque?: string;
  session_2_convoque?: string;
  session_3_convoque?: string;
  session_4_convoque?: string;
  session_5_convoque?: string;
  session_6_convoque?: string;
  session_7_convoque?: string;
  session_8_convoque?: string;
  session_9_convoque?: string;
  session_10_convoque?: string;
  session_11_convoque?: string;
  session_12_convoque?: string;
  session_13_convoque?: string;
  session_14_convoque?: string;
  session_15_convoque?: string;
  session_16_convoque?: string;
  session_17_convoque?: string;
  session_18_convoque?: string;
  session_19_convoque?: string;
  session_20_convoque?: string;

  // Présences (journées 1-20)
  journee_1_present?: boolean | null;
  journee_2_present?: boolean | null;
  journee_3_present?: boolean | null;
  journee_4_present?: boolean | null;
  journee_5_present?: boolean | null;
  journee_6_present?: boolean | null;
  journee_7_present?: boolean | null;
  journee_8_present?: boolean | null;
  journee_9_present?: boolean | null;
  journee_10_present?: boolean | null;
  journee_11_present?: boolean | null;
  journee_12_present?: boolean | null;
  journee_13_present?: boolean | null;
  journee_14_present?: boolean | null;
  journee_15_present?: boolean | null;
  journee_16_present?: boolean | null;
  journee_17_present?: boolean | null;
  journee_18_present?: boolean | null;
  journee_19_present?: boolean | null;
  journee_20_present?: boolean | null;

  // Présences spécifiques
  presence_9_mars: boolean | null;
  presence_10_mars: boolean | null;
  presence_16_avril: boolean | null;
  presence_17_avril: boolean | null;
  
  // Défense
  date_defense: string | null;
  heure_defense: string | null;
  localisation_defense: string | null;
  
  // Noms des relations (pour affichage)
  guide_nom?: string;
  guide_prenom?: string;
  lecteur_interne_nom?: string;
  lecteur_interne_prenom?: string;
  lecteur_externe_nom?: string;
  lecteur_externe_prenom?: string;
  mediateur_nom?: string;
  mediateur_prenom?: string;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// Guide = Employee (sauf direction et coordination)
export interface Guide {
  id: string;  // UUID de employees
  nom: string;
  prenom: string;
  initiale: string;
  email?: string;
  job?: string;
  mot_de_passe?: string | null;
}

// Lecteur externe (table tfh_lecteurs_externes)
export interface LecteurExterne {
  id: string;  // UUID
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  mot_de_passe?: string | null;
}

// Médiateur (table tfh_mediateurs)
export interface Mediateur {
  id: string;  // UUID
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  mot_de_passe?: string | null;
}

// Coordinateur n'existe plus comme table - ce sont des employees dans le groupe de travail
// On garde l'interface pour compatibilité mais elle n'est plus utilisée directement
export interface Coordinateur {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  mot_de_passe?: string | null;
}

// Événement de défense (inchangé)
export interface DefenseEvent {
  id: string;  // student_matricule en string pour compatibilité
  eleveId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  eleveNom: string;
  elevePrenom: string;
  guideNom: string;
  guidePrenom: string;
  lecteurInterneNom: string;
  lecteurInternePrenom: string;
  lecteurExterneNom: string;
  lecteurExternePrenom: string;
  mediateurNom: string;
  mediateurPrenom: string;
  categorie: string;
  role?: 'guide' | 'lecteur_interne';
}

export interface DayDefenses {
  date: string;
  displayDate: string;
  locations: string[];
  defenses: DefenseEvent[];
}

export interface Conflict {
  type: 'guide' | 'lecteur_interne' | 'lecteur_externe' | 'mediateur' | 'local';
  personOrLocation: string;
  conflictingDefenses: DefenseEvent[];
  message: string;
}

// Stats (inchangé)
export interface StatsData {
  totalEleves: number;
  avecThematique: number;
  avecProblematique: number;
  avecSources: number;
  avecGuide: number;
  avecLecteurInterne: number;
  avecLecteurExterne: number;
  pourcentageThematique: number;
  pourcentageProblematique: number;
  pourcentageSources: number;
  pourcentageGuide: number;
  pourcentageLecteurInterne: number;
  pourcentageLecteurExterne: number;
}

// Stats par guide (inchangé)
export interface GuideStats {
  id: string;
  nom: string;
  prenom: string;
  initiale: string;
  elevesGuides: number;
  elevesLecteurInterne: number;
  convocationsMarsRendues: number;
  convocationsAvrilRendues: number;
  pourcentageConvocationsMars: number;
  pourcentageConvocationsAvril: number;
}

// Journées TFH (inchangé)
export interface JourneeTFH {
  id: number;
  date: string;
  libelle: string;
}

// Paramètres d'affichage (inchangé)
export interface DisplaySettings {
  lecteur_externe_voir_eleves: boolean;
  lecteur_externe_voir_guides: boolean;
  lecteur_externe_voir_lecteurs_internes: boolean;
  lecteur_externe_voir_mediateurs: boolean;
  lecteur_interne_voir_eleves: boolean;
  lecteur_interne_voir_guides: boolean;
  lecteur_interne_voir_lecteurs_externes: boolean;
  lecteur_interne_voir_mediateurs: boolean;
  mediateur_voir_eleves: boolean;
  mediateur_voir_guides: boolean;
  mediateur_voir_lecteurs_internes: boolean;
  mediateur_voir_lecteurs_externes: boolean;
}

// Types d'onglets
export type TabType = 'dashboard' | 'convocations' | 'presences' | 'defenses' | 'calendrier' | 'gestion-utilisateurs' | 'parametres' | 'stats' | 'controle' | 'liste-tfh';

// Types d'utilisateurs
export type UserType = 'eleves' | 'guides' | 'lecteurs-externes' | 'mediateurs' | 'coordinateurs';