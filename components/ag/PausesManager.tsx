// components/ag/PausesManager.tsx
'use client';

import { useState } from 'react';

interface Pause {
  id: string;
  duree: number;
  heure_debut: string; // On ajoute l'heure de début
  position: number;
}

interface PausesManagerProps {
  pauses: Pause[];
  heureDebut: string;
  heureFin: string;
  onAdd: (duree: number, heure_debut: string) => Promise<void>;
  onUpdate: (pauseId: string, duree: number, heure_debut: string) => Promise<void>;
  onRemove: (pauseId: string) => Promise<void>;
}

export default function PausesManager({ 
  pauses, 
  heureDebut,
  heureFin,
  onAdd, 
  onUpdate, 
  onRemove 
}: PausesManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newHeure, setNewHeure] = useState('10:00');
  const [newDuree, setNewDuree] = useState('15');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHeure, setEditHeure] = useState('');
  const [editDuree, setEditDuree] = useState('');

  // Générer des suggestions d'heures (tranches de 30 min)
  const getHeureSuggestions = () => {
    const suggestions = [];
    const debut = heureToMinutes(heureDebut);
    const fin = heureToMinutes(heureFin);
    
    for (let minutes = debut + 30; minutes < fin - 30; minutes += 30) {
      suggestions.push(minutesToHeure(minutes));
    }
    return suggestions;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const duree = parseInt(newDuree);
    if (isNaN(duree) || duree < 1) return;

    await onAdd(duree, newHeure);
    
    setIsAdding(false);
    setNewHeure('10:00');
    setNewDuree('15');
  };

  const handleUpdate = async (pauseId: string) => {
    const duree = parseInt(editDuree);
    if (isNaN(duree) || duree < 1) return;

    await onUpdate(pauseId, duree, editHeure);
    setEditingId(null);
  };

  const startEdit = (pause: Pause) => {
    setEditingId(pause.id);
    setEditHeure(pause.heure_debut);
    setEditDuree(pause.duree.toString());
  };

  // Trier les pauses par heure
  const sortedPauses = [...pauses].sort((a, b) => 
    heureToMinutes(a.heure_debut) - heureToMinutes(b.heure_debut)
  );

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Pauses</h3>
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-700">
          ⏱️ L'AG dure de {heureDebut} à {heureFin}
        </p>
      </div>

      {/* Liste des pauses existantes */}
      {sortedPauses.length > 0 && (
        <div className="space-y-3 mb-6">
          {sortedPauses.map((pause, index) => (
            <div key={pause.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              {editingId === pause.id ? (
                // Mode édition
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 w-16">Heure:</span>
                    <input
                      type="time"
                      value={editHeure}
                      onChange={(e) => setEditHeure(e.target.value)}
                      min={heureDebut}
                      max={heureFin}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 w-16">Durée:</span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={editDuree}
                      onChange={(e) => setEditDuree(e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-500">min</span>
                  </div>
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => handleUpdate(pause.id)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                // Mode affichage
                <>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-mono text-gray-500 w-16">
                      {pause.heure_debut}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Pause {index + 1}
                      </p>
                      <p className="text-xs text-gray-500">
                        {pause.duree} minutes
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(pause)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => onRemove(pause.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {isAdding ? (
        <form onSubmit={handleAdd} className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Ajouter une pause</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Heure de début</label>
              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={newHeure}
                  onChange={(e) => setNewHeure(e.target.value)}
                  min={heureDebut}
                  max={heureFin}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {getHeureSuggestions().map(heure => (
                  <button
                    key={heure}
                    type="button"
                    onClick={() => setNewHeure(heure)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {heure}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Durée</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={newDuree}
                  onChange={(e) => setNewDuree(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                />
                <span className="text-sm text-gray-500">minutes</span>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
              >
                Annuler
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 text-sm font-medium rounded-md hover:border-gray-400 hover:text-gray-700"
        >
          + Ajouter une pause
        </button>
      )}

      {/* Info sur le temps total */}
      {sortedPauses.length > 0 && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <p className="text-sm text-purple-700">
            ⏸️ Temps total de pause : {sortedPauses.reduce((acc, p) => acc + p.duree, 0)} minutes
          </p>
        </div>
      )}
    </div>
  );
}

// Fonctions utilitaires
function heureToMinutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHeure(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${h.toString().padStart(2, '0')}`;
}
