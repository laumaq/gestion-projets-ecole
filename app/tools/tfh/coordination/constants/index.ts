// app/tools/tfh/coordination/constants/index.ts
export const CONVOCATION_OPTIONS = [
  { value: '', label: '-', color: 'bg-gray-100' },
  { value: 'Non, l\'élève atteint bien les objectifs', label: 'Non - Objectifs atteints', color: 'bg-green-100 text-green-800' },
  { value: 'Oui, l\'élève n\'atteint pas les objectifs', label: 'Oui - Objectifs non atteints', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Oui, l\'élève n\'a pas avancé', label: 'Oui - Pas avancé', color: 'bg-red-100 text-red-800' },
  { value: 'Oui, l\'élève n\'a pas communiqué', label: 'Oui - Pas communiqué', color: 'bg-orange-100 text-orange-800' },
] as const;

export const TABS_CONFIG = [
  {
    id: 'dashboard',
    name: 'Tableau de bord',
    icon: '🛡️',
    color: 'blue',
  },
  {
    id: 'liste-tfh',
    name: 'Liste des TFH',
    icon: '📚',
    color: 'violet',
  },
  {
    id: 'convocations',
    name: 'Convocations',
    icon: '📝',
    color: 'purple',
  },
  {
    id: 'presences',
    name: 'Présences',
    icon: '✓',
    color: 'fuchsia',
  },
  {
    id: 'defenses',
    name: 'Défenses',
    icon: '🎓',
    color: 'green',
  },
  {
    id: 'calendrier',
    name: 'Calendrier',
    icon: '📅',
    color: 'orange',
  },
  {
    id: 'gestion-utilisateurs',
    name: 'Utilisateurs',
    icon: '👥',
    color: 'indigo',
  },
  {
    id: 'parametres',
    name: 'Paramètres',
    icon: '⚙️',
    color: 'gray',
  },
  {
    id: 'stats',
    name: 'Statistiques',
    icon: '📊',
    color: 'emerald',
  },
  {
    id: 'controle',
    name: 'Contrôle',
    icon: '👑',
    color: 'red',
  },
] as const;