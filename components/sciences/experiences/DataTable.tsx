// components/sciences/experiences/DataTable.tsx

'use client';

import { useState } from 'react';
import { ExpressionEvaluator } from '@/lib/sciences/expressionEvaluator';

interface Colonne {
  nom: string;
  unite: string;
  type: string;
}

interface Tableau {
  nom: string;
  colonnes: Colonne[];
}

interface Mesure {
  id: string;
  eleve_matricule: number;
  mesures: Record<string, number | null>;
  created_at: string;
  eleve?: {
    nom: string;
    prenom: string;
  };
}

interface VerificationConfig {
  tableau_index: number;
  expression: string;
  variable_cible: string;
  tolerance: number;
  active: boolean;
}

interface ExperienceParams {
  canAddNewMeasures: boolean;
  freezeDataBefore?: string;
  showCorrectionsForBefore?: string;
}

interface DataTableProps {
  tableau: Tableau;
  tableauIndex: number;
  mesures: Mesure[];
  userType: 'employee' | 'student';
  userId: number;
  userName: string;
  experienceParams?: ExperienceParams;
  verifications?: VerificationConfig[];
  onAjouterMesure: (valeurs: Record<string, number | null>) => void;
  onModifierMesure: (mesureId: string, valeurs: Record<string, number | null>) => void;
  onSupprimerMesure: (mesureId: string) => void;
  submitting: boolean;
}

export default function DataTable({
  tableau,
  tableauIndex,
  mesures,
  userType,
  userId,
  userName,
  experienceParams,
  verifications = [],
  onAjouterMesure,
  onModifierMesure,
  onSupprimerMesure,
  submitting
}: DataTableProps) {
  const [editingMesure, setEditingMesure] = useState<Mesure | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});

  const verification = verifications?.[0];

  const estMesureGelee = (mesure: Mesure) => {
    if (!experienceParams?.freezeDataBefore) return false;
    return new Date(mesure.created_at) < new Date(experienceParams.freezeDataBefore);
  };

  const peutAjouterMesure = () => {
    if (userType !== 'student') return false;
    if (experienceParams?.canAddNewMeasures === false) return false;
    return true;
  };

  const peutVoirCorrection = (mesure: Mesure) => {
    if (!experienceParams?.showCorrectionsForBefore) return false;
    return new Date(mesure.created_at) < new Date(experienceParams.showCorrectionsForBefore);
  };

  const isDuplicateMeasure = (nouvellesValeurs: Record<string, number | null>, excludeId?: string) => {
    return mesures.some(m => {
      if (excludeId && m.id === excludeId) return false;
      return Object.keys(nouvellesValeurs).every(key => m.mesures[key] === nouvellesValeurs[key]);
    });
  };

  const handleEdit = (mesure: Mesure) => {
    const valeursInitiales: Record<string, string> = {};
    Object.entries(mesure.mesures).forEach(([key, value]) => {
      valeursInitiales[key] = value?.toString() || '';
    });
    setValeurs(valeursInitiales);
    setEditingMesure(mesure);
  };

  const handleCancel = () => {
    setValeurs({});
    setEditingMesure(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mesuresNumeriques: Record<string, number | null> = {};
    tableau.colonnes.forEach(col => {
      const valeur = valeurs[col.nom];
      mesuresNumeriques[col.nom] = valeur === '' ? null : parseFloat(valeur);
    });

    if (userType === 'student' && !editingMesure) {
      if (isDuplicateMeasure(mesuresNumeriques)) {
        alert('Vous avez déjà entré exactement ces mesures. Veuillez modifier au moins une valeur.');
        return;
      }
    }

    if (editingMesure) {
      onModifierMesure(editingMesure.id, mesuresNumeriques);
    } else {
      onAjouterMesure(mesuresNumeriques);
    }
    setValeurs({});
    setEditingMesure(null);
  };

  const getEleveName = (mesure: Mesure) => {
    if (mesure.eleve) return `${mesure.eleve.prenom} ${mesure.eleve.nom}`;
    return `Élève #${mesure.eleve_matricule}`;
  };

  const isMyMesure = (mesure: Mesure) => userType === 'student' && mesure.eleve_matricule === userId;

  const mesuresTriees = [...mesures].sort((a, b) => {
    const aIsMine = isMyMesure(a);
    const bIsMine = isMyMesure(b);
    if (aIsMine && !bIsMine) return -1;
    if (!aIsMine && bIsMine) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{tableau.nom}</h2>
      </div>

      {userType === 'student' && peutAjouterMesure() && !editingMesure && (
        <div className="p-4 border-b border-gray-200 bg-green-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Ajouter une nouvelle mesure</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {tableau.colonnes.map((colonne) => (
                <div key={colonne.nom}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {colonne.nom} {colonne.unite && `(${colonne.unite})`}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={valeurs[colonne.nom] || ''}
                    onChange={(e) => setValeurs({...valeurs, [colonne.nom]: e.target.value})}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="Valeur"
                    disabled={submitting}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {submitting ? 'Envoi...' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingMesure && (
        <div className="p-4 border-b border-gray-200 bg-yellow-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Modifier la mesure</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tableau.colonnes.map((colonne) => (
                <div key={colonne.nom}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {colonne.nom} {colonne.unite && `(${colonne.unite})`}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={valeurs[colonne.nom] || ''}
                    onChange={(e) => setValeurs({...valeurs, [colonne.nom]: e.target.value})}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                    disabled={submitting}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm"
              >
                {submitting ? 'Enregistrement...' : 'Modifier'}
              </button>
            </div>
          </form>
        </div>
      )}

      {mesuresTriees.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Élève</th>
                {tableau.colonnes.map((colonne) => (
                  <th key={colonne.nom} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {colonne.nom} {colonne.unite && `(${colonne.unite})`}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mesuresTriees.map((mesure) => {
                // Évaluation de la vérification (avec gestion des erreurs)
                let verificationResult = null;
                let calculImpossible = false;
                if (verification && peutVoirCorrection(mesure) && isMyMesure(mesure)) {
                  try {
                    verificationResult = ExpressionEvaluator.verifierMesure(
                      verification.expression,
                      mesure.mesures,
                      verification.variable_cible,
                      verification.tolerance
                    );
                    if (verificationResult.valeurCalculee === null) {
                      calculImpossible = true;
                    }
                  } catch (e) {
                    calculImpossible = true;
                  }
                }
                const valeurCalculee = verificationResult?.valeurCalculee ?? null;
                const estCorrecte = verificationResult?.estValide ?? false;
                const afficherCorrection = verification && valeurCalculee !== null && !estCorrecte && isMyMesure(mesure);
                const afficherIncalculable = verification && calculImpossible && isMyMesure(mesure);

                return (
                  <tr key={mesure.id} className={isMyMesure(mesure) ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getEleveName(mesure)}
                      {isMyMesure(mesure) && <span className="ml-2 text-xs text-green-600">(moi)</span>}
                    </td>
                    {tableau.colonnes.map((colonne) => {
                      const valeur = mesure.mesures[colonne.nom];
                      const estColonneCible = verification && verification.variable_cible === colonne.nom;
                      const estValeurIncorrecte = estColonneCible && afficherCorrection;
                      return (
                        <td key={colonne.nom} className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={estValeurIncorrecte ? 'text-red-600 line-through' : 'text-gray-900'}>
                            {valeur !== null && valeur !== undefined
                              ? valeur.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                              : '-'}
                          </span>
                          {estColonneCible && afficherCorrection && (
                            <span className="text-green-600 ml-2">
                              (corrigé: {valeurCalculee!.toFixed(2)})
                            </span>
                          )}
                          {estColonneCible && afficherIncalculable && (
                            <span className="text-orange-500 ml-2" title="Les valeurs fournies ne permettent pas un calcul valide (hors domaine, division par zéro, etc.)">
                              (calcul impossible)
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(mesure.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {userType === 'student' && isMyMesure(mesure) && !estMesureGelee(mesure) && !afficherCorrection && !afficherIncalculable && (
                        <button onClick={() => handleEdit(mesure)} className="text-blue-600 hover:text-blue-800">
                          Modifier
                        </button>
                      )}
                      {userType === 'employee' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const valeursInitiales: Record<string, string> = {};
                              Object.entries(mesure.mesures).forEach(([key, value]) => {
                                valeursInitiales[key] = value?.toString() || '';
                              });
                              setValeurs(valeursInitiales);
                              setEditingMesure(mesure);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Voulez-vous vraiment supprimer cette mesure ?')) onSupprimerMesure(mesure.id);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucune mesure pour le moment</p>
        </div>
      )}
    </div>
  );
}