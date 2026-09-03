// app/tools/tfh/coordination/tabs/ParametresTab/sections/SectionAffichage.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react';
import ToggleSetting from '../../../components/ToggleSettings';

interface SectionAffichageProps {
  expanded: boolean;
  onToggle: () => void;
}

interface DisplaySettings {
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
  eleves_voir_guides: boolean;
  eleves_voir_defenses: boolean;
}

export default function SectionAffichage({ expanded, onToggle }: SectionAffichageProps) {
  const [loading, setLoading] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    lecteur_externe_voir_eleves: true,
    lecteur_externe_voir_guides: true,
    lecteur_externe_voir_lecteurs_internes: true,
    lecteur_externe_voir_mediateurs: true,
    lecteur_interne_voir_eleves: true,
    lecteur_interne_voir_guides: true,
    lecteur_interne_voir_lecteurs_externes: true,
    lecteur_interne_voir_mediateurs: true,
    mediateur_voir_eleves: true,
    mediateur_voir_guides: true,
    mediateur_voir_lecteurs_internes: true,
    mediateur_voir_lecteurs_externes: true,
    eleves_voir_guides: true,
    eleves_voir_defenses: true,
  });
  const [message, setMessage] = useState<{type: 'info' | 'error' | 'success', text: string} | null>(null);

  const showMessage = (type: 'info' | 'error' | 'success', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: displayData } = await supabase
        .from('tfh_system_settings')
        .select('*');
      
      if (displayData) {
        const settings: any = {};
        displayData.forEach(setting => {
          settings[setting.setting_key] = setting.setting_value === 'true';
        });
        setDisplaySettings(prev => ({ ...prev, ...settings }));
      }
    } catch (err) {
      console.error('Erreur chargement paramètres d\'affichage:', err);
      showMessage('error', 'Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const saveDisplaySetting = async (key: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('tfh_system_settings')
        .upsert({
          setting_key: key,
          setting_value: value ? 'true' : 'false',
          description: getSettingDescription(key),
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      
      setDisplaySettings(prev => ({ ...prev, [key]: value }));
      showMessage('success', 'Paramètre sauvegardé');
    } catch (err) {
      console.error('Erreur sauvegarde paramètre:', err);
      showMessage('error', 'Erreur lors de la sauvegarde');
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      'lecteur_externe_voir_eleves': 'Les lecteurs externes voient-ils les noms/prénoms des élèves ?',
      'lecteur_externe_voir_guides': 'Les lecteurs externes voient-ils les noms/prénoms des guides ?',
      'lecteur_externe_voir_lecteurs_internes': 'Les lecteurs externes voient-ils les noms/prénoms des lecteurs internes ?',
      'lecteur_externe_voir_mediateurs': 'Les lecteurs externes voient-ils les noms/prénoms des médiateurs ?',
      'lecteur_interne_voir_eleves': 'Les lecteurs internes voient-ils les noms/prénoms des élèves ?',
      'lecteur_interne_voir_guides': 'Les lecteurs internes voient-ils les noms/prénoms des guides ?',
      'lecteur_interne_voir_lecteurs_externes': 'Les lecteurs internes voient-ils les noms/prénoms des lecteurs externes ?',
      'lecteur_interne_voir_mediateurs': 'Les lecteurs internes voient-ils les noms/prénoms des médiateurs ?',
      'mediateur_voir_eleves': 'Les médiateurs voient-ils les noms/prénoms des élèves ?',
      'mediateur_voir_guides': 'Les médiateurs voient-ils les noms/prénoms des guides ?',
      'mediateur_voir_lecteurs_internes': 'Les médiateurs voient-ils les noms/prénoms des lecteurs internes ?',
      'mediateur_voir_lecteurs_externes': 'Les médiateurs voient-ils les noms/prénoms des lecteurs externes ?',
      'eleves_voir_guides': 'Les élèves voient-ils les informations de leur guide (nom, prénom) ?',
      'eleves_voir_defenses': 'Les élèves voient-ils les informations de leur défense (date, heure, lieu, médiateur, lecteurs) ?',
    };
    
    return descriptions[key] || 'Paramètre d\'affichage';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 text-green-600 rounded-lg">
            <Eye className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-800">Paramètres d'affichage</h3>
            <p className="text-sm text-gray-500">Anonymisation et visibilité par rôle</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t">
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
              message.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
              'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            <div className="border rounded-lg p-6">
              <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">🎓</span>
                Vue Élève
                <span className="text-sm font-normal text-gray-500 ml-2">(que voient les élèves ?)</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleSetting
                  label="Voir les guides (noms & prénoms)"
                  checked={displaySettings.eleves_voir_guides}
                  onChange={(checked) => saveDisplaySetting('eleves_voir_guides', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les informations de défense"
                  checked={displaySettings.eleves_voir_defenses}
                  onChange={(checked) => saveDisplaySetting('eleves_voir_defenses', checked)}
                  disabled={loading}
                />
              </div>
              
              {displaySettings.eleves_voir_defenses && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-700">
                  <p className="font-medium mb-1">Les élèves verront pour leur défense :</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Date et heure de la défense</li>
                    <li>Localisation / salle</li>
                    <li>Nom du médiateur (si autorisé)</li>
                    <li>Nom du lecteur interne (si autorisé)</li>
                    <li>Nom du lecteur externe (si autorisé)</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="border rounded-lg p-6">
              <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">👁️</span>
                Vue Lecteur Externe
                <span className="text-sm font-normal text-gray-500 ml-2">(que voient les lecteurs externes ?)</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleSetting
                  label="Voir les élèves (noms & prénoms)"
                  checked={displaySettings.lecteur_externe_voir_eleves}
                  onChange={(checked) => saveDisplaySetting('lecteur_externe_voir_eleves', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les guides (noms & prénoms)"
                  checked={displaySettings.lecteur_externe_voir_guides}
                  onChange={(checked) => saveDisplaySetting('lecteur_externe_voir_guides', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les lecteurs internes (noms & prénoms)"
                  checked={displaySettings.lecteur_externe_voir_lecteurs_internes}
                  onChange={(checked) => saveDisplaySetting('lecteur_externe_voir_lecteurs_internes', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les médiateurs (noms & prénoms)"
                  checked={displaySettings.lecteur_externe_voir_mediateurs}
                  onChange={(checked) => saveDisplaySetting('lecteur_externe_voir_mediateurs', checked)}
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="border rounded-lg p-6">
              <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">📖</span>
                Vue Lecteur Interne
                <span className="text-sm font-normal text-gray-500 ml-2">(que voient les lecteurs internes ?)</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleSetting
                  label="Voir les élèves (noms & prénoms)"
                  checked={displaySettings.lecteur_interne_voir_eleves}
                  onChange={(checked) => saveDisplaySetting('lecteur_interne_voir_eleves', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les guides (noms & prénoms)"
                  checked={displaySettings.lecteur_interne_voir_guides}
                  onChange={(checked) => saveDisplaySetting('lecteur_interne_voir_guides', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les lecteurs externes (noms & prénoms)"
                  checked={displaySettings.lecteur_interne_voir_lecteurs_externes}
                  onChange={(checked) => saveDisplaySetting('lecteur_interne_voir_lecteurs_externes', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les médiateurs (noms & prénoms)"
                  checked={displaySettings.lecteur_interne_voir_mediateurs}
                  onChange={(checked) => saveDisplaySetting('lecteur_interne_voir_mediateurs', checked)}
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="border rounded-lg p-6">
              <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">⚖️</span>
                Vue Médiateur
                <span className="text-sm font-normal text-gray-500 ml-2">(que voient les médiateurs ?)</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleSetting
                  label="Voir les élèves (noms & prénoms)"
                  checked={displaySettings.mediateur_voir_eleves}
                  onChange={(checked) => saveDisplaySetting('mediateur_voir_eleves', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les guides (noms & prénoms)"
                  checked={displaySettings.mediateur_voir_guides}
                  onChange={(checked) => saveDisplaySetting('mediateur_voir_guides', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les lecteurs internes (noms & prénoms)"
                  checked={displaySettings.mediateur_voir_lecteurs_internes}
                  onChange={(checked) => saveDisplaySetting('mediateur_voir_lecteurs_internes', checked)}
                  disabled={loading}
                />
                <ToggleSetting
                  label="Voir les lecteurs externes (noms & prénoms)"
                  checked={displaySettings.mediateur_voir_lecteurs_externes}
                  onChange={(checked) => saveDisplaySetting('mediateur_voir_lecteurs_externes', checked)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}