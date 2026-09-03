// app/tools/tfh/coordination/tabs/ParametresTab/sections/SectionNouvelleAnnee.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  AlertTriangle, ChevronDown, ChevronUp, RefreshCw, 
  Clock, Loader2, CheckCircle, XCircle, Shield
} from 'lucide-react';

interface ValidationDemande {
  id: number;
  demande_par: string;
  valide_par: string | null;
  statut: 'en_attente' | 'valide' | 'annule';
  demande_le: string;
  valide_le: string | null;
  annee_scolaire: string;
  demandeur_nom?: string;
  validateur_nom?: string;
}

interface SectionNouvelleAnneeProps {
  expanded: boolean;
  onToggle: () => void;
  onRefresh?: () => void;
}

export default function SectionNouvelleAnnee({ expanded, onToggle, onRefresh }: SectionNouvelleAnneeProps) {
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [anneeScolaire, setAnneeScolaire] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [demandeEnCours, setDemandeEnCours] = useState<ValidationDemande | null>(null);
  const [demandes, setDemandes] = useState<ValidationDemande[]>([]);
  const [message, setMessage] = useState<{type: 'info' | 'error' | 'success', text: string} | null>(null);

  const showMessage = (type: 'info' | 'error' | 'success', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const chargerDemandes = useCallback(async () => {
    try {
      const { data: demandesData, error } = await supabase
        .from('tfh_nouvelle_annee_validations')
        .select('*')
        .order('demande_le', { ascending: false });

      if (error) throw error;

      const demandesEnrichies = await Promise.all((demandesData || []).map(async (d) => {
        const enriched: ValidationDemande = { ...d };
        
        if (d.demande_par) {
          const { data: demandeur } = await supabase
            .from('employees')
            .select('prenom, nom')
            .eq('id', d.demande_par)
            .single();
          if (demandeur) {
            enriched.demandeur_nom = `${demandeur.prenom} ${demandeur.nom}`;
          }
        }
        
        if (d.valide_par) {
          const { data: validateur } = await supabase
            .from('employees')
            .select('prenom, nom')
            .eq('id', d.valide_par)
            .single();
          if (validateur) {
            enriched.validateur_nom = `${validateur.prenom} ${validateur.nom}`;
          }
        }
        
        return enriched;
      }));

      setDemandes(demandesEnrichies);

      const demandeAttente = demandesEnrichies.find(d => d.statut === 'en_attente');
      setDemandeEnCours(demandeAttente || null);

    } catch (err) {
      console.error('Erreur chargement demandes:', err);
    }
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('userId') || '';
    const name = localStorage.getItem('userName') || '';
    setUserId(id);
    setUserName(name);

    const now = new Date();
    const currentYearNum = now.getFullYear();
    const nextYearNum = currentYearNum + 1;
    setAnneeScolaire(`${currentYearNum}-${nextYearNum}`);

    chargerDemandes();
  }, [chargerDemandes]);

  const handleDemanderNouvelleAnnee = async () => {
    if (!anneeScolaire.trim()) {
      showMessage('error', 'Veuillez spécifier une année scolaire.');
      return;
    }

    setProcessing(true);

    try {
      const { data: existing } = await supabase
        .from('tfh_nouvelle_annee_validations')
        .select('*')
        .eq('statut', 'en_attente')
        .maybeSingle();

      if (existing) {
        showMessage('error', 'Une demande est déjà en attente de validation.');
        setProcessing(false);
        return;
      }

      const { error } = await supabase
        .from('tfh_nouvelle_annee_validations')
        .insert({
          demande_par: userId,
          statut: 'en_attente',
          annee_scolaire: anneeScolaire
        });

      if (error) throw error;

      showMessage('success', 'Demande créée. En attente de validation par un autre coordinateur.');
      setShowModal(false);
      await chargerDemandes();
      if (onRefresh) onRefresh();

    } catch (err) {
      console.error('Erreur:', err);
      showMessage('error', 'Erreur lors de la création de la demande.');
    } finally {
      setProcessing(false);
    }
  };

  const handleValiderNouvelleAnnee = async (demandeId: number) => {
    setProcessing(true);

    try {
      const { data: demande, error: fetchError } = await supabase
        .from('tfh_nouvelle_annee_validations')
        .select('*')
        .eq('id', demandeId)
        .single();

      if (fetchError) throw fetchError;

      if (demande.demande_par === userId) {
        showMessage('error', 'Vous ne pouvez pas valider votre propre demande.');
        setProcessing(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('tfh_nouvelle_annee_validations')
        .update({
          statut: 'valide',
          valide_par: userId,
          valide_le: new Date().toISOString()
        })
        .eq('id', demandeId);

      if (updateError) throw updateError;

      const { data: result, error: execError } = await supabase
        .rpc('executer_nouvelle_annee_tfh', {
          annee_scolaire: demande.annee_scolaire
        });

      if (execError) throw execError;

      showMessage('success', result || 'Nouvelle année TFH créée avec succès !');

      await chargerDemandes();
      if (onRefresh) onRefresh();

    } catch (err) {
      console.error('Erreur:', err);
      showMessage('error', 'Erreur lors de la validation: ' + (err as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAnnulerDemande = async (demandeId: number) => {
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('tfh_nouvelle_annee_validations')
        .update({
          statut: 'annule'
        })
        .eq('id', demandeId);

      if (error) throw error;

      showMessage('info', 'Demande annulée.');
      await chargerDemandes();

    } catch (err) {
      console.error('Erreur:', err);
      showMessage('error', 'Erreur lors de l\'annulation.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium"><Clock className="w-3 h-3" /> En attente</span>;
      case 'valide':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" /> Validée</span>;
      case 'annule':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium"><XCircle className="w-3 h-3" /> Annulée</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-800">Nouvelle année TFH</h3>
            <p className="text-sm text-gray-500">Archivage et réinitialisation des données</p>
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

          <div className="border border-red-200 rounded-lg p-6 bg-red-50/30">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-md font-semibold text-gray-800 mb-2">Archivage et réinitialisation</h4>
                <p className="text-sm text-gray-600 mb-4">Cette action va :</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                  <li>Archiver toutes les données TFH actuelles dans l'historique</li>
                  <li>Vider la table TFH des élèves pour repartir à zéro</li>
                  <li><span className="text-red-600 font-medium">⚠️ Cette action nécessite la validation d'un deuxième coordinateur</span></li>
                </ul>
                
                {demandeEnCours ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Une demande est en attente de validation
                        </p>
                        <p className="text-xs text-yellow-600">
                          Demandée par {demandeEnCours.demandeur_nom || demandeEnCours.demande_par}
                          {demandeEnCours.annee_scolaire && ` pour l'année ${demandeEnCours.annee_scolaire}`}
                        </p>
                      </div>
                      {demandeEnCours.demande_par === userId ? (
                        <button
                          onClick={() => handleAnnulerDemande(demandeEnCours.id)}
                          disabled={processing}
                          className="ml-auto px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:opacity-50"
                        >
                          Annuler
                        </button>
                      ) : (
                        <button
                          onClick={() => handleValiderNouvelleAnnee(demandeEnCours.id)}
                          disabled={processing}
                          className="ml-auto px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-1"
                        >
                          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Valider
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowModal(true)}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Demander une nouvelle année
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Historique des demandes */}
          {demandes.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Historique des demandes
              </h4>
              <div className="space-y-2">
                {demandes.slice(0, 5).map((demande) => (
                  <div key={demande.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{demande.annee_scolaire}</p>
                        <p className="text-xs text-gray-500">
                          Demandé par {demande.demandeur_nom || demande.demande_par}
                          {demande.valide_par && `, validé par ${demande.validateur_nom || demande.valide_par}`}
                        </p>
                      </div>
                      {getStatutBadge(demande.statut)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmation */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Nouvelle année TFH</h3>
            </div>

            <p className="text-gray-600 mb-4">Cette action va :</p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-2 mb-6">
              <li>Archiver toutes les données TFH actuelles dans l'historique</li>
              <li>Vider la table TFH des élèves pour repartir à zéro</li>
              <li><span className="text-red-600 font-medium">⚠️ Cette action nécessite la validation d'un deuxième coordinateur</span></li>
            </ul>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Année scolaire</label>
              <input
                type="text"
                value={anneeScolaire}
                onChange={(e) => setAnneeScolaire(e.target.value)}
                placeholder="Ex: 2024-2025"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <p className="text-xs text-gray-500 mt-1">Format: AAAA-AAAA (ex: 2024-2025)</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={processing}
              >
                Annuler
              </button>
              <button
                onClick={handleDemanderNouvelleAnnee}
                disabled={processing || !anneeScolaire.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Demander
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}