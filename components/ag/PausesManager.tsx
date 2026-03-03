// components/ag/PausesManager.tsx
'use client';

import { useState } from 'react';

interface Pause {
  id: string;
  duree: number;
  position: number; // On garde position mais on l'utilisera pour l'ordre d'affichage
}

interface PausesManagerProps {
  pauses: Pause[];
  heureDebut: string;
  heureFin: string;
  onAdd: (duree: number, position: number) => Promise<void>;
  onUpdate: (pauseId: string, duree: number, position: number) => Promise<void>;
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

  // Convertir une heure en minutes depuis minuit pour les comparaisons
  const heureToMinutes = (heure: string) => {
    const [h, m] = heure.split(':').map(Number);
    return h * 60 + m;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const duree = parseInt(newDuree);
    
    if (isNaN(duree) || duree < 1) return;

    // La position sera déterminée par l'ordre chronologique
    // On met une position provisoire (sera réordonnée dans l'affichage)
    await onAdd(duree, pauses.length);
    
    setIsAdding(false);
    setNewHeure('10:00');
    setNewDuree('15');
  };

  const handleUpdate = async (pauseId: string) => {
    const duree = parseInt(editDuree);
    
    if (isNaN(duree) || duree < 1) return;

    await onUpdate(pauseId, duree, 0); // La position sera réordonnée
    setEditingId(null);
  };

  const startEdit = (pause: Pause) => {
    setEditingId(pause.id);
    setEditDuree(pause.duree.toString());
    // Note: l'heure n'est pas stockée, on ne peut pas l'éditer
  };

  // Trier les pauses par heure (simulé ici - en vrai il faudrait stocker l'heure)
  const sortedPauses = [...pauses].sort((a, b) => a.position - b.position);

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
                <div className="flex-1 flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editDuree}
                    onChange={(e) => setEditDuree(e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm text-gray-500">minutes</span>
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
              ) : (
                // Mode affichage
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Pause {index + 1} • {pause.duree} minutes
                    </p>
                    <p className="text-xs text-gray-500">
                      Idéalement vers {Math.floor((pause.position * 30) + 30)}e minute
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(pause)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Modifier durée
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
