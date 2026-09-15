// app/tools/tfh/eleve/utils/constants.ts

import { 
  BookOpen as BookIcon,
  Users as UsersIcon,
  Palette,
  Hammer,
  GraduationCap,
  Target,
  Sparkles,
  BookOpen,
  User,
  Calendar
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

export const TAB_ICONS: Record<string, any> = {
  'mes-choix': BookOpen,
  'mon-carnet-de-bord': BookOpen,
  'mes-infos': User,
  'ma-defense': Calendar,
};

export const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || BookIcon;
};

export const getTabIcon = (iconName: string) => {
  return TAB_ICONS[iconName] || BookOpen;
};