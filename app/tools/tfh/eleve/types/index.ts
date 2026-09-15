// app/tools/tfh/eleve/types/index.ts

export interface JournalEntry {
  type: string;
  titre: string;
  contenu: string;
  date: string;
}

export interface DefenseInfo {
  date: string;
  heure: string;
  localisation: string;
  mediateur_nom?: string;
  mediateur_prenom?: string;
  mediateur_accepte_numerique?: boolean;
  lecteur_interne_nom?: string;
  lecteur_interne_initiale?: string;
  lecteur_interne_accepte_numerique?: boolean;
  lecteur_externe_nom?: string;
  lecteur_externe_prenom?: string;
  lecteur_externe_accepte_numerique?: boolean;
}

export interface SessionInfo {
  index: number;
  nom: string;
  date_debut: Date;
  statut: string;
}

export interface DisplaySettings {
  eleves_voir_guides: boolean;
  eleves_voir_defenses: boolean;
}

export interface EleveInfo {
  student_matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  type: string;
  problematique: string;
  thematique: string;
  description: string;
  source_1: string;
  source_2: string;
  source_3: string;
  source_4: string;
  source_5: string;
  categorie: string;
  guide_nom: string;
  guide_prenom: string;
  guide_initiale: string;
  guide_accepte_numerique?: boolean;
  journal: JournalEntry[];
  sessions?: SessionInfo[];
  defense?: DefenseInfo;
  displaySettings?: DisplaySettings;
  url_tfh?: string;
}

export interface TypeTFHDisplay {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export type TabId = 'mes-choix' | 'mon-carnet-de-bord' | 'mes-infos' | 'ma-defense';

export interface Tab {
  id: TabId;
  label: string;
  icon: string;
}