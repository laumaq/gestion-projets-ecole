// components/sciences/experiences/GraphiqueConfigurator.tsx
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

interface GraphiqueConfig {
  nom: string;
  type: 'scatter' | 'line' | 'bar';
  tableau_index: number;  // Ajouté
  axe_x: string;
  axe_y: string;
  groupe_par?: string;
}

interface GraphiqueConfiguratorProps {
  tableaux: Tableau[];  // Changé : tableau -> tableaux
  config?: GraphiqueConfig;
  onSave: (config: GraphiqueConfig) => void;
  onCancel: () => void;
}

export default function GraphiqueConfigurator({ 
  tableaux, 
  config, 
  onSave, 
  onCancel 
}: GraphiqueConfiguratorProps) {
  
  const [nom, setNom] = useState(config?.nom || '');
  const [type, setType] = useState<'scatter' | 'line' | 'bar'>(config?.type || 'scatter');
  const [tableauIndex, setTableauIndex] = useState(config?.tableau_index || 0);
  const [axeX, setAxeX] = useState(config?.axe_x || tableaux[0]?.colonnes[0]?.nom || '');
  const [axeY, setAxeY] = useState(config?.axe_y || tableaux[0]?.colonnes[1]?.nom || '');
  const [groupePar, setGroupePar] = useState(config?.groupe_par || '');

  const tableauCourant = tableaux[tableauIndex];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nom,
      type,
      tableau_index: tableauIndex,
      axe_x: axeX,
      axe_y: axeY,
      groupe_par: groupePar || undefined
    });
  };

  // Mettre à jour les axes quand le tableau change
  const handleTableauChange = (index: number) => {
    setTableauIndex(index);
    const nouveauTableau = tableaux[index];
    setAxeX(nouveauTableau?.colonnes[0]?.nom || '');
    setAxeY(nouveauTableau?.colonnes[1]?.nom || '');
    setGroupePar('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom du graphique
        </label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          required
          placeholder="Ex: I en fonction de U"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type de graphique
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'scatter' | 'line' | 'bar')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="scatter">Nuage de points</option>
          <option value="line">Lignes</option>
          <option value="bar">Barres</option>
        </select>
      </div>

      {/* Nouveau : Sélection du tableau source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tableau de données
        </label>
        <select
          value={tableauIndex}
          onChange={(e) => handleTableauChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {tableaux.map((tableau, index) => (
            <option key={index} value={index}>
              {tableau.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Axe X
          </label>
          <select
            value={axeX}
            onChange={(e) => setAxeX(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          >
            {tableauCourant?.colonnes.map((col) => (
              <option key={col.nom} value={col.nom}>
                {col.nom} ({col.unite})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Axe Y
          </label>
          <select
            value={axeY}
            onChange={(e) => setAxeY(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          >
            {tableauCourant?.colonnes.map((col) => (
              <option key={col.nom} value={col.nom}>
                {col.nom} ({col.unite})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Grouper par (optionnel)
        </label>
        <select
          value={groupePar}
          onChange={(e) => setGroupePar(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Ne pas grouper</option>
          {tableauCourant?.colonnes
            .filter(col => col.nom !== axeX && col.nom !== axeY)
            .map(col => (
              <option key={col.nom} value={col.nom}>
                {col.nom} ({col.unite})
              </option>
            ))
          }
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Si vous groupez par une variable, chaque valeur différente créera une série distincte
        </p>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          Sauvegarder
        </button>
      </div>
    </form>
  );
}