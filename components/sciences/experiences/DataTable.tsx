// components/sciences/DataTable.tsx
'use client';

import { useState } from 'react';

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

interface DataTableProps {
  tableau: Tableau;
  tableauIndex: number;
  mesures: Mesure[];
  userType: 'employee' | 'student';
  userId: number;
  userName: string;
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
  onAjouterMesure,
  onModifierMesure,
  onSupprimerMesure,
  submitting
}: DataTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingMesure, setEditingMesure] = useState<Mesure | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convertir les valeurs en nombres (ou null si vide)
    const mesuresNumeriques: Record<string, number | null> = {};
    tableau.colonnes.forEach(col => {
      const valeur = valeurs[col.nom];
      mesuresNumeriques[col.nom] = valeur === '' ? null : parseFloat(valeur);
    });

    if (editingMesure) {
      onModifierMesure(editingMesure.id, mesuresNumeriques);
    } else {
      onAjouterMesure(mesuresNumeriques);
    }

    // Réinitialiser le formulaire
    setValeurs({});
    setShowForm(false);
    setEditingMesure(null);
  };

  const handleEdit = (mesure: Mesure) => {
    // Pré-remplir le formulaire avec les valeurs existantes
    const valeursInitiales: Record<string, string> = {};
    Object.entries(mesure.mesures).forEach(([key, value]) => {
      valeursInitiales[key] = value?.toString() || '';
    });
    setValeurs(valeursInitiales);
    setEditingMesure(mesure);
    setShowForm(true);
  };

  const handleCancel = () => {
    setValeurs({});
    setShowForm(false);
    setEditingMesure(null);
  };

  const getEleveName = (mesure: Mesure) => {
    if (mesure.eleve) {
      return `${mesure.eleve.prenom} ${mesure.eleve.nom}`;
    }
    return `Élève #${mesure.eleve_matricule}`;
  };

  const isMyMesure = (mesure: Mesure) => {
    return userType === 'student' && mesure.eleve_matricule === userId;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* En-tête du tableau */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{tableau.nom}</h2>
      </div>

      {/* Formulaire d'ajout/édition */}
      {(showForm || userType === 'student') && (
        <div className="p-6 border-b border-gray-200 bg-green-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            {editingMesure ? 'Modifier la mesure' : 'Ajouter une nouvelle mesure'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Entrez une valeur"
                    disabled={submitting}
                  />
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Enregistrement...' : editingMesure ? 'Modifier' : 'Ajouter'}
              </button>
              {showForm && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tableau des mesures */}
      {mesures.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Élève
                </th>
                {tableau.colonnes.map((colonne) => (
                  <th key={colonne.nom} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {colonne.nom} {colonne.unite && `(${colonne.unite})`}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mesures.map((mesure) => (
                <tr key={mesure.id} className={isMyMesure(mesure) ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getEleveName(mesure)}
                    {isMyMesure(mesure) && (
                      <span className="ml-2 text-xs text-green-600">(moi)</span>
                    )}
                  </td>
                  {tableau.colonnes.map((colonne) => (
                    <td key={colonne.nom} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mesure.mesures[colonne.nom] !== null && mesure.mesures[colonne.nom] !== undefined
                        ? mesure.mesures[colonne.nom]
                        : '-'
                      }
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(mesure.created_at).toLocaleTimeString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {isMyMesure(mesure) && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(mesure)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => onSupprimerMesure(mesure.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucune mesure pour le moment</p>
          {userType === 'student' && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Ajouter la première mesure
            </button>
          )}
        </div>
      )}

      {/* Bouton pour ouvrir le formulaire (si pas déjà ouvert) */}
      {userType === 'student' && !showForm && mesures.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            + Ajouter une mesure
          </button>
        </div>
      )}
    </div>
  );
}