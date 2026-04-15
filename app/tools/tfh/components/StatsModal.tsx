// app/tools/tfh/components/StatsModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Eleve } from '../coordination/types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  missingField: string;
}

export default function StatsModal({ isOpen, onClose, title, missingField }: StatsModalProps) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && missingField) {
      loadEleves();
    }
  }, [isOpen, missingField]);

  async function loadEleves() {
    setLoading(true);
    try {
      // Récupérer les élèves avec la colonne manquante (null ou vide)
      let query = supabase
        .from('tfh_eleves')
        .select(`
          student_matricule,
          guide_id,
          problematique,
          thematique,
          categorie,
          source_1,
          source_2,
          source_3,
          source_4,
          source_5,
          students!inner (nom, prenom, classe)
        `);

      // Filtrer selon le champ manquant
      if (missingField === 'guide') {
        query = query.is('guide_id', null);
      } else if (missingField === 'problematique') {
        query = query.or('problematique.is.null, problematique.eq.');
      } else if (missingField === 'thematique') {
        query = query.or('thematique.is.null, thematique.eq.');
      } else if (missingField === 'sources') {
        query = query.or('source_1.is.null, source_1.eq., source_2.is.null, source_2.eq., source_3.is.null, source_3.eq., source_4.is.null, source_4.eq., source_5.is.null, source_5.eq.');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Formater les données
      const formattedEleves: Eleve[] = (data || []).map(item => ({
        student_matricule: item.student_matricule,
        id: item.student_matricule,
        nom: (item.students as any)?.nom || '',
        prenom: (item.students as any)?.prenom || '',
        classe: (item.students as any)?.classe || '',
        guide_id: item.guide_id,
        problematique: item.problematique || '',
        thematique: item.thematique || '',
        categorie: item.categorie || '',
        convocation_mars: '',
        convocation_avril: '',
        presence_9_mars: null,
        presence_10_mars: null,
        presence_16_avril: null,
        presence_17_avril: null,
        date_defense: null,
        heure_defense: null,
        localisation_defense: null,
        lecteur_interne_id: null,
        lecteur_externe_id: null,
        mediateur_id: null
      }));

      setEleves(formattedEleves);
    } catch (error) {
      console.error('Erreur chargement élèves:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {title} - {eleves.length} élève(s)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des données...</p>
            </div>
          ) : eleves.length === 0 ? (
            <div className="text-center py-8 text-green-600">
              <p className="text-lg">🎉 Tous les élèves ont cette information complète !</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom & Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Classe
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guide
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eleves.map((eleve) => (
                    <tr key={eleve.student_matricule} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {eleve.nom} {eleve.prenom}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {eleve.classe}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {eleve.guide_id ? 'Assigné' : 'Non assigné'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {missingField.toUpperCase()} manquant
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}