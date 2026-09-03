// app/tools/tfh/coordination/tabs/ParametresTab/sections/SectionFonctionnels.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Settings, ChevronDown, ChevronUp, Save, Info, CheckCircle, AlertCircle
} from 'lucide-react';
import ToggleSetting from '../../../components/ToggleSettings';

interface SectionFonctionnelsProps {
  expanded: boolean;
  onToggle: () => void;
}

export default function SectionFonctionnels({ expanded, onToggle }: SectionFonctionnelsProps) {
  const [loading, setLoading] = useState(false);
  const [lecteurInterneEnabled, setLecteurInterneEnabled] = useState(false);
  const [phasePreparatoireEnabled, setPhasePreparatoireEnabled] = useState(false);
  const [autorisationModification, setAutorisationModification] = useState(true);
  const [objectifGeneral, setObjectifGeneral] = useState('');
  const [savingObjectif, setSavingObjectif] = useState(false);
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
      const { data: functionalData } = await supabase
        .from('tfh_system_settings')
        .select('*')
        .eq('setting_key', 'guide_lecteur_interne_enabled')
        .maybeSingle();
      
      if (functionalData) {
        setLecteurInterneEnabled(functionalData.setting_value === 'true');
      }

      const { data: phasePreparatoireData } = await supabase
        .from('tfh_system_settings')
        .select('*')
        .eq('setting_key', 'phase_preparatoire')
        .maybeSingle();
    
      if (phasePreparatoireData) {
        setPhasePreparatoireEnabled(phasePreparatoireData.setting_value === 'true');
      }

      const { data: displayData } = await supabase
        .from('tfh_system_settings')
        .select('*');
      
      if (displayData) {
        const autorisation = displayData.find(d => d.setting_key === 'autorisation_modification_problematique');
        if (autorisation) {
          setAutorisationModification(autorisation.setting_value === 'true');
        }
      }

      const { data: objectifData } = await supabase
        .from('tfh_system_settings')
        .select('*')
        .eq('setting_key', 'objectif_general_tfh')
        .maybeSingle();
      
      if (objectifData) {
        setObjectifGeneral(objectifData.setting_value || '');
      }
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
      showMessage('error', 'Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const toggleLecteurInterne = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tfh_system_settings')
        .upsert({
          setting_key: 'guide_lecteur_interne_enabled',
          setting_value: enabled ? 'true' : 'false',
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      
      setLecteurInterneEnabled(enabled);
      showMessage('info', `Onglet "Lecteur interne" ${enabled ? 'activé' : 'désactivé'} pour les guides.`);
    } catch (err) {
      console.error('Erreur mise à jour paramètre:', err);
      showMessage('error', 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const togglePhasePreparatoire = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tfh_system_settings')
        .upsert({
          setting_key: 'phase_preparatoire',
          setting_value: enabled ? 'true' : 'false',
          description: 'Phase préparatoire globale - quand true, les élèves voient thématique et sources à la place des convocations',
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      
      setPhasePreparatoireEnabled(enabled);
      showMessage('info', `Phase préparatoire ${enabled ? 'activée' : 'désactivée'}.`);
    } catch (err) {
      console.error('Erreur mise à jour paramètre:', err);
      showMessage('error', 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutorisationModification = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('tfh_system_settings')
        .upsert({
          setting_key: 'autorisation_modification_problematique',
          setting_value: enabled ? 'true' : 'false',
          description: 'Autoriser les élèves à modifier leur problématique',
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      
      setAutorisationModification(enabled);
      showMessage('success', `Modification des problématiques ${enabled ? 'autorisée' : 'bloquée'}.`);
    } catch (err) {
      console.error('Erreur mise à jour paramètre:', err);
      showMessage('error', 'Erreur lors de la mise à jour');
    }
  };

  const saveObjectifGeneral = async () => {
    if (objectifGeneral.trim() === '') {
      showMessage('error', 'L\'objectif ne peut pas être vide');
      return;
    }
  
    setSavingObjectif(true);
    try {
      const { error } = await supabase
        .from('tfh_system_settings')
        .upsert({
          setting_key: 'objectif_general_tfh',
          setting_value: objectifGeneral,
          description: 'Objectif général pour tous les élèves TFH',
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
      
      if (error) throw error;
      
      showMessage('success', 'Objectif général sauvegardé avec succès !');
    } catch (err) {
      console.error('Erreur sauvegarde objectif:', err);
      showMessage('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSavingObjectif(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-800">Paramètres fonctionnels</h3>
            <p className="text-sm text-gray-500">Gestion des autorisations et fonctionnalités</p>
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

          <div className="border border-blue-200 rounded-lg p-6 mb-4">
            <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">🚦</span>
              Autorisations
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-800 mb-1">Onglet "Lecteur interne" pour les guides</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Autorise les guides à sélectionner des TFH en tant que lecteur interne
                  </p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={lecteurInterneEnabled}
                      onChange={(e) => toggleLecteurInterne(e.target.checked)}
                      disabled={loading}
                    />
                    <div className={`block w-14 h-8 rounded-full ${lecteurInterneEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${lecteurInterneEnabled ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {lecteurInterneEnabled ? 'Activé' : 'Désactivé'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🚧</span>
                    Phase préparatoire globale
                  </h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Activez cette option pour tous les élèves :
                    <span className="block mt-1 text-xs">
                      • La thématique s'affiche avant la problématique
                      <br />• 5 champs de sources documentaires apparaissent
                      <br />• Les convocations sont masquées
                      <br />• Un badge "Phase préparatoire" s'affiche
                    </span>
                  </p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={phasePreparatoireEnabled}
                      onChange={(e) => togglePhasePreparatoire(e.target.checked)}
                      disabled={loading}
                    />
                    <div className={`block w-14 h-8 rounded-full ${phasePreparatoireEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${phasePreparatoireEnabled ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {phasePreparatoireEnabled ? 'Activée' : 'Désactivée'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-800 mb-1">Modification des problématiques par les élèves</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Autorise les élèves à modifier leur problématique de recherche
                  </p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={autorisationModification}
                      onChange={(e) => toggleAutorisationModification(e.target.checked)}
                      disabled={loading}
                    />
                    <div className={`block w-14 h-8 rounded-full ${autorisationModification ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${autorisationModification ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {autorisationModification ? 'Activé' : 'Désactivé'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="border border-green-200 rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-700 mb-4 flex items-center gap-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">🎯</span>
              Objectif général TFH
            </h4>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="objectif-general" className="block text-sm font-medium text-gray-700 mb-2">
                  Objectif pédagogique pour tous les élèves
                </label>
                <textarea
                  id="objectif-general"
                  value={objectifGeneral}
                  onChange={(e) => setObjectifGeneral(e.target.value)}
                  className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Exemple : Développer une approche critique et méthodique du travail de recherche..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Cet objectif sera visible par tous les utilisateurs selon leurs droits d'accès.
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={saveObjectifGeneral}
                  disabled={savingObjectif || objectifGeneral.trim() === ''}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    objectifGeneral.trim() !== '' && !savingObjectif
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {savingObjectif ? 'Sauvegarde...' : 'Sauvegarder l\'objectif'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}