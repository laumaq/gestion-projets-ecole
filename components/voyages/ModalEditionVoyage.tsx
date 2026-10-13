// components/voyages/ModalEditionVoyage.tsx

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Voyage {
  id: string;
  nom: string;
  destination: string;
  date_debut: string;
  date_fin: string;
}

interface Props {
  voyage: Voyage;
  onClose: () => void;
  onSaved: (updated: Partial<Voyage>) => void;
}

export default function ModalEditionVoyage({ voyage, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  const [nom, setNom] = useState(voyage.nom);
  const [destination, setDestination] = useState(voyage.destination);
  const [dateDebut, setDateDebut] = useState(voyage.date_debut?.split('T')[0] || '');
  const [dateFin, setDateFin] = useState(voyage.date_fin?.split('T')[0] || '');

  const [erreur, setErreur] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (!nom.trim()) {
      setErreur('Le nom est obligatoire.');
      return;
    }
    if (!dateDebut || !dateFin) {
      setErreur('Les deux dates sont obligatoires.');
      return;
    }
    if (new Date(dateFin) < new Date(dateDebut)) {
      setErreur('La date de fin doit être après la date de début.');
      return;
    }

    setSaving(true);

    const payload = {
      nom: nom.trim(),
      destination: destination.trim(),
      date_debut: dateDebut,
      date_fin: dateFin,
    };

    const { error } = await supabase
      .from('voyages')
      .update(payload)
      .eq('id', voyage.id);

    setSaving(false);

    if (error) {
      console.error(error);
      setErreur('Erreur lors de l\'enregistrement : ' + error.message);
      return;
    }

    onSaved(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Modifier le voyage</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du voyage
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                disabled={saving}
              />
            </div>
          </div>

          {erreur && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {erreur}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}