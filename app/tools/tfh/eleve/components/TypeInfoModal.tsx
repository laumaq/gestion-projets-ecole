// app/tools/tfh/eleve/components/TypeInfoModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen, Users, Palette, Hammer, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TypeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  label: string;
}

// Mapping des types vers les clés de la BDD
const TYPE_SETTING_KEYS: Record<string, string> = {
  mémoire: 'tfh_type_memoire_description',
  associatif: 'tfh_type_associatif_description',
  artistique: 'tfh_type_artistique_description',
  atelier: 'tfh_type_atelier_description',
};

const TYPE_ICONS = {
  mémoire: BookOpen,
  associatif: Users,
  artistique: Palette,
  atelier: Hammer,
};

// Fonction pour enlever les balises HTML et garder juste le texte (fallback si nécessaire)
const stripHtml = (html: string) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export default function TypeInfoModal({ isOpen, onClose, type, label }: TypeInfoModalProps) {
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !type) return;

    const loadDescription = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const settingKey = TYPE_SETTING_KEYS[type];
        if (!settingKey) {
          setError('Description non disponible pour ce type.');
          setLoading(false);
          return;
        }

        const { data, error: supabaseError } = await supabase
          .from('tfh_system_settings')
          .select('setting_value')
          .eq('setting_key', settingKey)
          .maybeSingle();

        if (supabaseError) throw supabaseError;

        if (data?.setting_value) {
          setDescription(data.setting_value);
        } else {
          // Fallback: description par défaut en dur
          setDescription(getFallbackDescription(type));
        }
      } catch (err) {
        console.error('Erreur chargement description:', err);
        setError('Impossible de charger la description.');
        setDescription(getFallbackDescription(type));
      } finally {
        setLoading(false);
      }
    };

    loadDescription();
  }, [isOpen, type]);

  // Description de fallback au cas où la BDD n'a pas la clé
  const getFallbackDescription = (typeKey: string): string => {
    const fallbacks: Record<string, string> = {
      mémoire: '<h3>Le format traditionnel</h3><p>Tu choisis individuellement une problématique et tu la développes à l\'aide de ton corpus de sources ou de données collectées sur ton terrain de recherche.</p>',
      associatif: '<h3>Le format stage</h3><p>Tu intègres une structure qui partage les mêmes valeurs que l\'Athénée de Waha.</p>',
      artistique: '<h3>Le format chef-d\'œuvre</h3><p>Tu produis, en autonomie, une œuvre que tu présentes au public des portes ouvertes ainsi qu\'à un jury TFH.</p>',
      atelier: '<h3>Le format atelier</h3><p>En binôme, vous proposez une thématique pour un atelier que vous encadrez.</p>',
    };
    return fallbacks[typeKey] || '<p>Description non disponible.</p>';
  };

  if (!isOpen) return null;

  const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] || BookOpen;

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
            className="prose prose-sm max-w-none text-gray-700"
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