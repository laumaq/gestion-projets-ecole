// app/tools/tfh/eleve/components/TypeInfoModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen, Users, Palette, Hammer, Loader2, GraduationCap, Target, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TypeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  label: string;
}

// Mapping des noms d'icônes vers les composants Lucide
const ICON_MAP: Record<string, any> = {
  BookOpen: BookOpen,
  Users: Users,
  Palette: Palette,
  Hammer: Hammer,
  GraduationCap: GraduationCap,
  Target: Target,
  Sparkles: Sparkles,
};

// Fonction pour obtenir l'icône à partir du nom
const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || BookOpen;
};

// Mapping des types vers les clés de la BDD - CORRIGÉ
const TYPE_SETTING_KEYS: Record<string, { description: string; icon: string }> = {
  traditionnel: { 
    description: 'tfh_type_traditionnel_description',
    icon: 'tfh_type_traditionnel_icon'
  },
  stage: { 
    description: 'tfh_type_stage_description',
    icon: 'tfh_type_stage_icon'
  },
  chefdoeuvre: { 
    description: 'tfh_type_chefdoeuvre_description',
    icon: 'tfh_type_chefdoeuvre_icon'
  },
  atelier: { 
    description: 'tfh_type_atelier_description',
    icon: 'tfh_type_atelier_icon'
  },
};

// Fonction pour enlever les balises HTML et garder juste le texte (fallback si nécessaire)
const stripHtml = (html: string) => {
  if (typeof window === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export default function TypeInfoModal({ isOpen, onClose, type, label }: TypeInfoModalProps) {
  const [description, setDescription] = useState<string>('');
  const [iconName, setIconName] = useState<string>('BookOpen');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !type) return;

    const loadTypeData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const typeKeys = TYPE_SETTING_KEYS[type];
        if (!typeKeys) {
          setError('Description non disponible pour ce type.');
          setLoading(false);
          return;
        }

        // Charger la description et l'icône en parallèle
        const [descResult, iconResult] = await Promise.all([
          supabase
            .from('tfh_system_settings')
            .select('setting_value')
            .eq('setting_key', typeKeys.description)
            .maybeSingle(),
          supabase
            .from('tfh_system_settings')
            .select('setting_value')
            .eq('setting_key', typeKeys.icon)
            .maybeSingle()
        ]);

        if (descResult.error) throw descResult.error;
        if (iconResult.error) throw iconResult.error;

        // Définir la description
        if (descResult.data?.setting_value) {
          setDescription(descResult.data.setting_value);
        } else {
          // Fallback: description par défaut en dur
          setDescription(getFallbackDescription(type));
        }

        // Définir l'icône
        if (iconResult.data?.setting_value) {
          setIconName(iconResult.data.setting_value);
        } else {
          // Fallback: icône par défaut
          setIconName(getFallbackIcon(type));
        }
      } catch (err) {
        console.error('Erreur chargement données type:', err);
        setError('Impossible de charger la description.');
        setDescription(getFallbackDescription(type));
        setIconName(getFallbackIcon(type));
      } finally {
        setLoading(false);
      }
    };

    loadTypeData();
  }, [isOpen, type]);

  // Description de fallback au cas où la BDD n'a pas la clé - CORRIGÉ
  const getFallbackDescription = (typeKey: string): string => {
    const fallbacks: Record<string, string> = {
      traditionnel: `<h3>Le format traditionnel</h3>
        <p>Tu choisis individuellement une problématique et tu la développes à l'aide de ton corpus de sources ou de données collectées sur ton terrain de recherche.</p>
        <p>Ton évaluation consiste en un exposé oral devant un jury, structuré autour du compte rendu critique que tu auras produit.</p>`,

      stage: `<h3>Le format stage</h3>
        <p>Pour ce format, tu dois intégrer une structure qui partage les mêmes valeurs que l'Athénée de Waha. Par exemple, tu prends en charge des lectures pour l'ASBL La Lumière, tu deviens la cheville ouvrière d'une maison de jeunes dans un quartier peu favorisé, tu intègres un collectif féministe ou tu donnes de ton temps pour un centre de réfugiés. Les exemples ne manquent pas.</p>
        <p>Outre ton implication sur place, une partie de ton travail consiste à documenter l'activité de ta structure et à conserver des traces de ton investissement.</p>
        <p>Celles-ci te permettront de produire un compte rendu (au choix : écrit, sonore ou visuel) à la fois factuel et réflexif sur cette incroyable expérience.</p>
        <p>Le GT TFH doit valider ton choix de structure et le volume d'heures que tu comptes prester. Ton évaluation consiste en un exposé oral devant un jury, structuré autour du compte rendu critique que tu auras produit.</p>`,

      chefdoeuvre: `<h3>Le format chef-d'œuvre</h3>
        <p>Tu produis, en autonomie, une œuvre que tu présentes au public des portes ouvertes ainsi qu'à un jury TFH.</p>
        <p>Cette œuvre peut être de nature variée : création artistique, projet technique, production écrite, etc.</p>`,

      atelier: `<h3>Le format atelier</h3>
        <p>En binôme, vous proposez une thématique pour un atelier que vous encadrez.</p>
        <p>Vous devez préparer et animer un atelier pour vos pairs, en lien avec votre thématique choisie.</p>`,
    };
    return fallbacks[typeKey] || '<p>Description non disponible.</p>';
  };

  // Icône de fallback au cas où la BDD n'a pas la clé
  const getFallbackIcon = (typeKey: string): string => {
    const fallbacks: Record<string, string> = {
      traditionnel: 'BookOpen',
      stage: 'Users',
      chefdoeuvre: 'Palette',
      atelier: 'Hammer',
    };
    return fallbacks[typeKey] || 'BookOpen';
  };

  if (!isOpen) return null;

  const Icon = getIconComponent(iconName);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <Icon className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">{label}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="ml-3 text-gray-500">Chargement...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : (
          <div 
            className="prose prose-sm max-w-none text-gray-700 space-y-3"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}

        {/* Bouton */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}