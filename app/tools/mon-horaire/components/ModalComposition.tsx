// app/tools/mon-horaire/components/ModalComposition.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Eleve } from '../types';

interface ModalCompositionProps {
  groupe: string;
  titre: string;
  onClose: () => void;
}

export default function ModalComposition({ groupe, titre, onClose }: ModalCompositionProps) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setEleves([]);

      if (!groupe) {
        setLoading(false);
        return;
      }

      try {
        const { data: sg, error: e1 } = await supabase
          .from('students_groups')
          .select('matricule')
          .eq('groupe_code', groupe);

        if (e1 || !sg || sg.length === 0) {
          setLoading(false);
          return;
        }

        const matricules = sg.map((s: any) => s.matricule);

        const { data: e, error: e2 } = await supabase
          .from('students')
          .select('matricule, nom, prenom, classe')
          .in('matricule', matricules);

        if (e2) {
          console.error(e2);
          setEleves([]);
        } else {
          // Tri : classe → nom → prénom
          const trie = (e || []).slice().sort((a: Eleve, b: Eleve) => {
            const cA = (a.classe || '').toLowerCase();
            const cB = (b.classe || '').toLowerCase();
            if (cA !== cB) return cA.localeCompare(cB);
            const nA = (a.nom || '').toLowerCase();
            const nB = (b.nom || '').toLowerCase();
            if (nA !== nB) return nA.localeCompare(nB);
            const pA = (a.prenom || '').toLowerCase();
            const pB = (b.prenom || '').toLowerCase();
            return pA.localeCompare(pB);
          });
          setEleves(trie);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [groupe]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{titre}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Groupe : {groupe}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-gray-500 text-center py-8">Chargement...</p>
          ) : eleves.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucun élève trouvé dans ce groupe.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">
                {eleves.length} élève{eleves.length > 1 ? 's' : ''}
              </p>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Classe
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Nom
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Prénom
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {eleves.map((e) => (
                    <tr key={e.matricule}>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {e.classe || '—'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">{e.nom}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{e.prenom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}