// app/tools/tfh/eleve/tabs/vade-mecum/sections/ContactGT.tsx
'use client';

import { useEffect, useState } from 'react';
import { Mail, AlertCircle, Loader2, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MembreGT {
  id: string;
  nom: string;
  prenom: string;
  initiale?: string;
  email?: string;
}

// UUID du groupe GT TFH (à définir en BDD)
const GROUPE_GT_TFH = '0092b3db-1f7e-40e1-8f6b-70219d6a50f2';

export default function ContactGT() {
  const [membres, setMembres] = useState<MembreGT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembres = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, nom, prenom, initiale, email')
          .eq('groupe_id', GROUPE_GT_TFH)
          .order('nom', { ascending: true });

        if (error) throw error;
        setMembres(data || []);
      } catch (err) {
        console.error('Erreur chargement membres GT:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMembres();
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
        <h2 className="text-2xl font-bold text-indigo-700">Comment contacter le GT TFH</h2>
      </div>

      <div className="space-y-5 text-gray-700 leading-relaxed">
        <p>
          Le GT TFH est là pour t'accompagner tout au long de ton projet. Si tu as une question concernant le choix de ton format, une étape du calendrier, ton projet, ton guide ou encore les modalités de présentation et de défense, tu peux nous contacter.
        </p>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-900 mb-2">
                Pour toute question concernant le TFH, privilégie un message via Smartschool.
              </p>
              <p className="text-sm mb-3">Lorsque tu écris au GT, pense à :</p>
              <ul className="list-disc list-inside space-y-1.5 text-sm ml-2">
                <li>préciser clairement que ta demande concerne le TFH ;</li>
                <li>indiquer un objet de message explicite, par exemple : <em>TFH question concernant mon projet</em> ;</li>
                <li>expliquer brièvement ta question ou ta difficulté afin que nous puissions te répondre le plus efficacement possible ;</li>
                <li>si nécessaire, joindre les documents utiles à la compréhension de ta demande.</li>
              </ul>
              <p className="text-sm mt-3 italic">
                Plus ta demande est précise, plus il nous sera facile de t'aider rapidement.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-800 mb-3">
            Tu peux t'adresser à l'un des membres du groupe de travail :
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Chargement des membres…</span>
            </div>
          ) : membres.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500 italic">
              La liste des membres du GT n'est pas disponible pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {membres.map((membre) => (
                <div
                  key={membre.id}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">
                    {membre.prenom} {membre.nom}
                    {membre.initiale ? ` ${membre.initiale}.` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-500 mt-3 italic">
            Le GT travaille collectivement : selon la nature de ta demande, ton message pourra donc être pris en charge par l'un ou l'autre de ses membres.
          </p>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-5 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 mb-1">
                Une question ? Une difficulté ? N'attends pas.
              </p>
              <p className="text-sm text-amber-800">
                Le TFH se construit progressivement. Si tu bloques, si tu hésites ou si tu ne sais pas comment avancer, contacte le GT plutôt que de laisser la difficulté s'installer. Une question posée au bon moment peut souvent permettre de débloquer rapidement ton projet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}