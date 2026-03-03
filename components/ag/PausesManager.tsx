// components/ag/PausesManager.tsx
'use client';

import { useState } from 'react';
import { Pause } from '@/hooks/useAGData';

interface PausesManagerProps {
  pauses: Pause[];
  nbInterventions: number;
  onAdd: (duree: number, position: number) => Promise<void>;
  onUpdate: (pauseId: string, duree: number, position: number) => Promise<void>;
  onRemove: (pauseId: string) => Promise<void>;
}

export default function PausesManager({ 
  pauses, 
  nbInterventions, 
  onAdd, 
  onUpdate, 
  onRemove 
}: PausesManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDuree, setNewDuree] = useState('15');
  const [newPosition, setNewPosition] = useState('1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDuree, setEditDuree] = useState('');
  const [editPosition, setEditPosition] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const duree = parseInt(newDuree);
    const position = parseInt(newPosition);
    
    if (isNaN(duree) || duree < 1) return;
    if (isNaN(position) || position < 0 || position > nbInterventions) return;

    await onAdd(duree, position);
    setIsAdding(false);
    setNewDuree('15');
    setNewPosition('1');
  };

  const handleUpdate = async (pauseId: string) => {
    const duree = parseInt(editDuree);
    const position = parseInt(editPosition);
    
    if (isNaN(duree) || duree < 1) return;
    if (isNaN(position) || position < 0 || position > nbInterventions) return;

    await onUpdate(pauseId, duree, position);
    setEditingId(null);
  };

  const startEdit = (pause: Pause) => {
    setEditingId(pause.id);
    setEditDuree(pause.duree.toString());
    setEditPosition(pause.position.toString());
  };

  const getPositionLabel = (position: number) => {
    if (position === 0) return 'Avant la 1ère intervention';
    if (position === nbInterventions) return 'Après la dernière intervention';
    return `Après l'intervention #${position}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Gestion des pauses</h3>
      
      {/* Liste des pauses existantes */}
      {pauses.length > 0 && (
        <div className="space-y-3 mb-6">
          {pauses
            .sort((a, b) => a.position - b.position)
            .map((pause) => (
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
                    <span className="text-sm text-gray-500">min</span>
                    <select
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="0">Avant la 1ère</option>
                      {Array.from({ length: nbInterventions }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Après #{i + 1}
                        </option>
                      ))}
                      {nbInterventions > 0 && (
                        <option value={nbInterventions}>Après la dernière</option>
                      )}
                    </select>
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
                        Pause {getPositionLabel(pause.position)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {pause.duree} minutes
                      </p>
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

            <select
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              required
            >
              <option value="0">Avant la 1ère intervention</option>
              {Array.from({ length: nbInterventions }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Après l'intervention #{i + 1}
                </option>
              ))}
              {nbInterventions > 0 && (
                <option value={nbInterventions}>Après la dernière intervention</option>
              )}
            </select>

            <div className="flex space-x-2">
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
      {pauses.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            ⏱️ Temps total de pause : {pauses.reduce((acc, p) => acc + p.duree, 0)} minutes
          </p>
        </div>
      )}
    </div>
  );
}
