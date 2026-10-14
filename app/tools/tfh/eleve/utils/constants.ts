// app/tools/tfh/eleve/utils/constants.ts

import { 
  BookOpen as BookIcon,
  Users as UsersIcon,
  Palette,
  Hammer,
  GraduationCap,
  Target,
  CalendarDays,
  Sparkles,
  BookOpen,
  User,
  Calendar,
  FolderOpen
} from 'lucide-react';

export const ICON_MAP: Record<string, any> = {
  BookOpen: BookIcon,
  Users: UsersIcon,
  Palette: Palette,
  Hammer: Hammer,
  GraduationCap: GraduationCap,
  Target: Target,
  Sparkles: Sparkles,
};

import { BookMarked } from 'lucide-react';

export const TAB_ICONS: Record<string, any> = {
  'mes-choix': BookOpen,
  'mon-carnet-de-bord': BookOpen,
  'mes-infos': User,
  'echeancier': CalendarDays,
  'ma-defense': Calendar,
  'documents': FolderOpen,
  'vade-mecum': BookMarked,
};

export const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || BookIcon;
};

export const getTabIcon = (iconName: string) => {
  return TAB_ICONS[iconName] || BookOpen;
};