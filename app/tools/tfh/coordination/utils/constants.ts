// app/tools/tfh/coordination/utils/constants.ts
import {
  BookOpen, Users, Palette, Hammer, FileText, Target,
  ClipboardList, MessageSquare, GraduationCap, Award,
  Briefcase, Lightbulb, Star, Heart, Music, Camera,
  Mic, PenTool, FlaskConical, Globe, Leaf, Rocket,
  Sparkles, Trophy, Wrench, Zap, Building2, Microscope,
  Video, Code, Brush, Scissors, ChefHat, Plane, Languages,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Mapping des noms d'icônes (stockés en BDD dans tfh_type_{key}_icon)
 * vers les composants Lucide correspondants.
 *
 * ⚠️ Si une icône est ajoutée dans SectionTypesTFH (côté Paramètres),
 * il faut penser à l'ajouter ici également.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  // Icônes de base
  BookOpen,
  FileText,
  Target,
  ClipboardList,
  MessageSquare,
  GraduationCap,
  Award,

  // Projets / travail
  Briefcase,
  Hammer,
  Wrench,
  PenTool,
  Brush,
  Scissors,
  ChefHat,
  Code,

  // Collaboration / social
  Users,
  Heart,

  // Art / culture
  Palette,
  Music,
  Camera,
  Video,
  Mic,

  // Sciences / exploration
  FlaskConical,
  Microscope,
  Globe,
  Leaf,
  Plane,
  Languages,

  // Concepts / inspiration
  Lightbulb,
  Star,
  Sparkles,
  Rocket,
  Zap,
  Trophy,

  // Institutionnel
  Building2,
};

/**
 * Retourne le composant Lucide correspondant au nom donné.
 * Fallback sur FileText si l'icône n'existe pas.
 */
export function getIconComponent(name: string | undefined | null): LucideIcon {
  if (!name) return FileText;
  return ICON_MAP[name] || FileText;
}