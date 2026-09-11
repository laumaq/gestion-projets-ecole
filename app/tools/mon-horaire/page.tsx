// app/tools/mon-horaire/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Cours {
  cours_id: number;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  prof: string;         // JSON stringifié: ["id1", "id2"]
  matiere: string;
  salle: string;
  type_pattern: string;
  raw_pattern: string;
}

interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
}

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

export default function MonHorairePage() {
  const [cours, setCours] = useState<Cours[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitre, setModalTitre] = useState('');
  const [modalEleves, setModalEleves] = useState<Eleve[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Charger les cours du prof connecté
  useEffect(() => {
    async function loadCours() {
    const userId = localStorage.getItem('userId');
    const name = localStorage.getItem('userName') || '';
    setUserName(name);

    if (!userId) {
        setLoading(false);
        return;
    }

    try {
        // Filtrer côté serveur : cours où prof contient userId
        const { data, error } = await supabase
        .from('courses')
        .select('*')
        .like('prof', `%${userId}%`);

        if (error) {
        console.error('Erreur chargement cours:', error);
        setLoading(false);
        return;
        }

        // Trier par jour puis heure
        const sorted = (data || []).sort((a, b) => {
        const jA = JOURS_ORDRE.indexOf((a.jour || '').toLowerCase());
        const jB = JOURS_ORDRE.indexOf((b.jour || '').toLowerCase());
        if (jA !== jB) return jA - jB;
        return (a.heure_debut || '').localeCompare(b.heure_debut || '');
        });

        setCours(sorted);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
    }

    loadCours();
  }, []);

  // Ouvrir le modal avec la composition du groupe
  async function openComposition(c: Cours) {
    setModalOpen(true);
    setModalTitre(`${c.matiere} — ${c.jour} ${c.heure_debut}`);
    setModalLoading(true);
    setModalEleves([]);

    // On extrait le groupe principal depuis raw_pattern
    // Ex: "[5+6-LM1-NI]" ou "5PAT" ou "<...>"
    const groupe = extraireGroupe(c.raw_pattern);

    if (!groupe) {
      setModalLoading(false);
      return;
    }

    try {
      // 1. Trouver tous les matricules dans ce groupe
      const { data: sg, error: e1 } = await supabase
        .from('students_groups')
        .select('matricule')
        .eq('groupe_code', groupe);

      if (e1 || !sg || sg.length === 0) {
        setModalLoading(false);
        return;
      }

      const matricules = sg.map((s: any) => s.matricule);

      // 2. Récupérer les infos des élèves
      const { data: eleves, error: e2 } = await supabase
        .from('students')
        .select('matricule, nom, prenom, classe')
        .in('matricule', matricules)
        .order('nom', { ascending: true });

      if (e2) {
        console.error(e2);
      } else {
        setModalEleves(eleves || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  }

  // Extraction du nom de groupe depuis raw_pattern
  function extraireGroupe(raw: string): string | null {
    if (!raw) return null;
    // Cas 1 : [groupe]
    const match = raw.match(/\[([^\]]+)\]/);
    if (match) return match[1].trim();
    // Cas 2 : classe simple (ex: "5PAT")
    const matchClasse = raw.match(/^(\d+PA[A-Z])/);
    if (matchClasse) return matchClasse[1];
    // Cas 3 : complexe sans groupe
    return null;
  }

  // Formatage du jour
  function formatJour(j: string) {
    if (!j) return '';
    return j.charAt(0).toUpperCase() + j.slice(1).toLowerCase();
  }

  // Rendu
  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500">
        Chargement de votre horaire...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mon horaire</h1>
        {userName && (
          <p className="text-gray-600 mt-1">
            {userName} — {cours.length} heure{cours.length > 1 ? 's' : ''} de cours
          </p>
        )}
      </div>

      {cours.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Aucun cours à afficher.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jour
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heure
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matière
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salle
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Groupe
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cours.map((c) => {
                const groupe = extraireGroupe(c.raw_pattern);
                const isExterne = c.type_pattern === 'externe';
                return (
                  <tr
                    key={c.cours_id}
                    onClick={() => !isExterne && openComposition(c)}
                    className={
                      isExterne
                        ? 'bg-gray-100 text-gray-400 italic'
                        : 'hover:bg-blue-50 cursor-pointer'
                    }
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatJour(c.jour)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {c.heure_debut} – {c.heure_fin}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {c.matiere || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.salle || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {isExterne ? (
                        <span className="text-gray-400">Autre école</span>
                      ) : groupe ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {groupe}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal composition */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalTitre}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {modalLoading ? (
                <p className="text-gray-500 text-center py-8">Chargement...</p>
              ) : modalEleves.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Aucun élève trouvé dans ce groupe.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    {modalEleves.length} élève{modalEleves.length > 1 ? 's' : ''}
                  </p>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Nom
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Prénom
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Classe
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {modalEleves.map((e) => (
                        <tr key={e.matricule}>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {e.nom}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {e.prenom}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {e.classe || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}