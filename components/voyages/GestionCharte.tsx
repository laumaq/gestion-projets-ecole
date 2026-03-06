// components/voyages/GestionCharte.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import EditeurCharte from './EditeurCharte';

interface Props {
  voyageId: string;
  isResponsable: boolean;
  userType: 'employee' | 'student' | null;
}

export default function GestionCharte({ voyageId, isResponsable, userType }: Props) {
  const [contenu, setContenu] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(1);

  const isEleve = userType === 'student';
  const peutEditer = isResponsable; // Seuls les responsables peuvent éditer

  useEffect(() => {
    loadCharte();
  }, [voyageId]);

  const loadCharte = async () => {
    const { data } = await supabase
      .from('voyage_chartes')
      .select('contenu, version')
      .eq('voyage_id', voyageId)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setContenu(data.contenu);
      setVersion(data.version);
    }
    setLoading(false);
  };

  const saveCharte = async () => {
    if (!contenu.trim()) return;
    
    await supabase
      .from('voyage_chartes')
      .insert({
        voyage_id: voyageId,
        contenu: contenu,
        version: version + 1,
        created_by: localStorage.getItem('userId')
      });
    
    setVersion(version + 1);
    setEditing(false);
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Charte du voyage</h2>
          <p className="text-gray-600 mt-1">
            Version {version} • {contenu ? 'Publiée' : 'Non publiée'}
          </p>
        </div>
        
        {/* Bouton de modification - uniquement pour les responsables */}
        {peutEditer && !editing && contenu && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Modifier la charte
          </button>
        )}
      </div>

      {/* Contenu */}
      {editing ? (
        // Mode édition (responsables uniquement)
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <EditeurCharte
              value={contenu}
              onChange={setContenu}
              placeholder="Rédigez votre charte..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveCharte}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Publier
            </button>
            <button
              onClick={() => {
                setEditing(false);
                loadCharte();
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        // Mode lecture (pour tout le monde)
        <div className="bg-white rounded-lg border p-6">
          {contenu ? (
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: contenu }} />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">??</div>
              <p className="text-lg mb-2">Aucune charte définie</p>
              <p className="text-sm">
                {isEleve 
                  ? "Les organisateurs n'ont pas encore défini de charte pour ce voyage."
                  : "Créez une charte que les élèves devront accepter."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pour les élèves : rappel de l'acceptation (optionnel) */}
      {isEleve && contenu && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">
            ? Vous avez accepté cette charte. Vous pouvez la relire à tout moment.
          </p>
        </div>
      )}
    </div>
  );
}