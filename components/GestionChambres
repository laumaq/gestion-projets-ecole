'use client';

import { useState } from 'react';

interface Chambre {
  id: number;
  numero: string;
  capacite: number;
  occupants: string[];
  type: 'simple' | 'double' | 'triple' | 'quadruple';
}

interface Props {
  projet: string;
}

export default function GestionChambres({ projet }: Props) {
  const [chambres, setChambres] = useState<Chambre[]>([
    { id: 1, numero: '101', capacite: 4, occupants: ['Marie Dupont', 'Julie Martin', 'Anne Petit'], type: 'quadruple' },
    { id: 2, numero: '102', capacite: 2, occupants: ['Paul Durand', 'Thomas Leroy'], type: 'double' },
    { id: 3, numero: '103', capacite: 3, occupants: ['Lucie Bernard', 'Sophie Moreau'], type: 'triple' },
    { id: 4, numero: '104', capacite: 4, occupants: [], type: 'quadruple' },
  ]);

  const [selectedChambre, setSelectedChambre] = useState<Chambre | null>(null);
  const [newOccupant, setNewOccupant] = useState('');

  const addOccupant = (chambreId: number) => {
    if (!newOccupant.trim()) return;
    
    setChambres(chambres.map(chambre => {
      if (chambre.id === chambreId && chambre.occupants.length < chambre.capacite) {
        return {
          ...chambre,
          occupants: [...chambre.occupants, newOccupant]
        };
      }
      return chambre;
    }));
    
    setNewOccupant('');
  };

  const removeOccupant = (chambreId: number, occupantIndex: number) => {
    setChambres(chambres.map(chambre => {
      if (chambre.id === chambreId) {
        return {
          ...chambre,
          occupants: chambre.occupants.filter((_, index) => index !== occupantIndex)
        };
      }
      return chambre;
    }));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'simple': return 'bg-blue-100 text-blue-800';
      case 'double': return 'bg-green-100 text-green-800';
      case 'triple': return 'bg-yellow-100 text-yellow-800';
      case 'quadruple': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🏨 Gestion des chambres</h2>
          <p className="text-gray-600 text-sm mt-1">Projet: {projet}</p>
        </div>
        <div className="text-sm text-gray-500">
          {chambres.reduce((acc, c) => acc + c.occupants.length, 0)} / 
          {chambres.reduce((acc, c) => acc + c.capacite, 0)} places occupées
        </div>
      </div>

      <div className="p-6">
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {chambres.filter(c => c.type === 'simple').length}
            </div>
            <div className="text-sm text-blue-800">Simples</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {chambres.filter(c => c.type === 'double').length}
            </div>
            <div className="text-sm text-green-800">Doubles</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {chambres.filter(c => c.type === 'triple').length}
            </div>
            <div className="text-sm text-yellow-800">Triples</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {chambres.filter(c => c.type === 'quadruple').length}
            </div>
            <div className="text-sm text-purple-800">Quadruples</div>
          </div>
        </div>

        {/* Liste des chambres */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chambres.map((chambre) => (
            <div 
              key={chambre.id}
              className={`border rounded-xl p-5 transition-all hover:shadow-md ${
                selectedChambre?.id === chambre.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedChambre(chambre)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Chambre {chambre.numero}</h3>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full mt-2 inline-block ${getTypeColor(chambre.type)}`}>
                    {chambre.type.toUpperCase()} • {chambre.capacite} places
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {chambre.occupants.length}/{chambre.capacite}
                  </div>
                  <div className="text-xs text-gray-500">occupés</div>
                </div>
              </div>

              {/* Liste des occupants */}
              <div className="space-y-2 mb-4">
                {chambre.occupants.length > 0 ? (
                  chambre.occupants.map((occupant, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{occupant}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOccupant(chambre.id, index);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Retirer
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    Aucun occupant
                  </div>
                )}
              </div>

              {/* Ajouter un occupant */}
              {chambre.occupants.length < chambre.capacite && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={selectedChambre?.id === chambre.id ? newOccupant : ''}
                    onChange={(e) => setNewOccupant(e.target.value)}
                    placeholder="Nom de l'occupant..."
                    className="flex-1 border rounded px-3 py-2 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addOccupant(chambre.id);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                  >
                    Ajouter
                  </button>
                </div>
              )}

              {/* Barre de progression */}
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${(chambre.occupants.length / chambre.capacite) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions globales */}
        <div className="mt-6 pt-6 border-t flex justify-between">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">
            Exporter la répartition
          </button>
          <button className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700">
            Générer la liste des chambres
          </button>
        </div>
      </div>
    </div>
  );
}
