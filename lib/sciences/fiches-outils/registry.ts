// ============================================================
// lib/fiches-outils/registry.ts
// Registre centralisé — ajouter ici chaque nouvelle fiche.
// ============================================================

export interface FicheOutil {
  key: string;          // doit correspondre aux colonnes SQL (ex: 'unites')
  title: string;
  description: string;
  subject: string;      // 'physique' | 'chimie' | 'maths' …
  niveaux: string[];    // ex: ['1', '2', '3'] — niveau.startsWith()
  href: string;         // route Next.js
  color: 'green' | 'teal' | 'blue' | 'amber' | 'purple';
  icon: 'ruler' | 'atom' | 'function' | 'flask' | 'lightning';
}

export const FICHES_OUTILS: FicheOutil[] = [
  {
    key: 'unites',
    title: 'Contrat — Unités',
    description: 'Préfixes SI, conversions et notation scientifique',
    subject: 'physique',
    niveaux: ['1', '2', '3', '4', '5', '6'],
    href: '/tools/sciences/fiches-outils/unites',
    color: 'green',
    icon: 'ruler',
  },
  // Ajouter les prochaines fiches ici :
  // {
  //   key: 'grandeurs',
  //   title: 'Grandeurs et unités',
  //   description: 'Équations aux unités, calcul d\'aires et volumes',
  //   subject: 'physique',
  //   niveaux: ['1', '2'],
  //   href: '/tools/sciences/fiches-outils/grandeurs',
  //   color: 'teal',
  //   icon: 'atom',
  // },
];

export const FICHE_COLOR_MAP = {
  green:  { border: '#97C459', bg: '#EAF3DE', text: '#3B6D11', badge: '#C0DD97' },
  teal:   { border: '#5DCAA5', bg: '#E1F5EE', text: '#0F6E56', badge: '#9FE1CB' },
  blue:   { border: '#85B7EB', bg: '#E6F1FB', text: '#185FA5', badge: '#B5D4F4' },
  amber:  { border: '#EF9F27', bg: '#FAEEDA', text: '#854F0B', badge: '#FAC775' },
  purple: { border: '#AFA9EC', bg: '#EEEDFE', text: '#534AB7', badge: '#CECBF6' },
};