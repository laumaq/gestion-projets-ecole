'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  phaseId: string;
  phase: any;
  userType: 'employee' | 'student';
  userId: string;
  onJoined: () => void;
}

export default function ChoisirGroupe({ phaseId, phase, userType, userId, onJoined }: Props) {
  const [groupes, setGroupes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [veutEtreAnimateur, setVeutEtreAnimateur] = useState(false);

  useEffect(() => { load(); }, [phaseId]);

  const load = async () => {
    setLoading(true);
    const { data: gr } = await supabase
      .from('conseil_lutte_groupes')
      .select(`id, nom, capacite_max, localisation_fixe(id, etage)`)
      .eq('phase_id', phaseId)
      .order('nom');

    const ids = (gr || []).map(g => g.id);
    const counts: Record<string, { eleves: number; employes: number; manuel: boolean }> = {};
    ids.forEach(id => { counts[id] = { eleves: 0, employes: 0, manuel: false }; });

    if (ids.length > 0) {
      const { data: mbs } = await supabase
        .from('conseil_lutte_membres')
        .select('groupe_id, participant_type, manuel')
        .in('groupe_id', ids);
      (mbs || []).forEach(m => {
        if (m.participant_type === 'student') counts[m.groupe_id].eleves++;
        else counts[m.groupe_id].employes++;
        if (m.manuel && m.participant_type === 'student') counts[m.groupe_id].manuel = true;
      });
    }

    setGroupes((gr || []).map(g => ({
      ...g,
      elevesCount: counts[g.id].eleves,
      employesCount: counts[g.id].employes,
      aDejaUnManuel: counts[g.id].manuel,
    })));
    setLoading(false);
  };

  const rejoindre = async (groupeId: string) => {
    if (joining) return;

    // Cas "je veux être animateur·rice"
    if (veutEtreAnimateur && userType === 'student') {
      // Vérifier qu'il n'y a pas déjà un animateur
      const { data: existing } = await supabase
        .from('conseil_lutte_animateurs')
        .select('student_matricule')
        .eq('groupe_id', groupeId)
        .maybeSingle();

      if (existing) {
        alert('Ce groupe a déjà un·e animateur·rice.');
        return;
      }

      if (!confirm(
        `Vous allez rejoindre ce groupe en tant qu'animateur·rice.\n\n` +
        `Confirmer ? (Vous pourrez quitter et changer de groupe plus tard.)`
      )) return;
    }

    setJoining(true);

    // 1. Insertion du membre
    const { error: errMembre } = await supabase.from('conseil_lutte_membres').insert({
      groupe_id: groupeId,
      participant_id: userId,
      participant_type: userType === 'student' ? 'student' : 'employee',
      manuel: veutEtreAnimateur && userType === 'student', // manuel = true si animateur
    });

    if (errMembre) {
      alert('Erreur : ' + errMembre.message);
      setJoining(false);
      return;
    }

    // 2. Si animateur, insert dans la table animateurs
    if (veutEtreAnimateur && userType === 'student') {
      const { error: errAnim } = await supabase.from('conseil_lutte_animateurs').insert({
        groupe_id: groupeId,
        student_matricule: parseInt(userId),
        nomme_par: 'auto',
      });
      if (errAnim) {
        alert('Erreur nomination animateur·rice : ' + errAnim.message);
      }
    }

    setJoining(false);
    onJoined();
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  // Règle "fill équitable" encadrants
  const minEncadrants = groupes.length > 0 ? Math.min(...groupes.map(g => g.employesCount)) : 0;

  const peutRejoindre = (g: any) => {
    if (userType === 'student') {
      if (!phase?.inscription_eleves_ouverte) return false;
      if (g.aDejaUnManuel) return false; // ← un élève ne peut pas rejoindre un groupe qui a déjà son manuel
      return !g.capacite_max || g.elevesCount < g.capacite_max;
    }
    // Employés : règle "fill équitable"
    return g.employesCount === minEncadrants;
  };

  const inscriptionOuverte = userType === 'employee' || phase?.inscription_eleves_ouverte;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          {inscriptionOuverte
            ? (userType === 'employee'
                ? "Choisissez un groupe. Pour équilibrer l'encadrement, seuls les groupes avec le moins d'encadrants sont proposés."
                : "Choisissez un groupe. Inscriptions ouvertes pour cette phase.")
            : "Les inscriptions pour cette phase ne sont pas ouvertes. Contactez un membre de la direction."}
        </p>

        {/* ⬇️ INSÈRE ICI ⬇️ */}
        {userType === 'student' && inscriptionOuverte && (
          <label className="mt-3 flex items-start gap-2 cursor-pointer text-sm text-blue-800">
            <input
              type="checkbox"
              checked={veutEtreAnimateur}
              onChange={(e) => setVeutEtreAnimateur(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Je souhaite être animateur·rice du groupe que je vais rejoindre.</span>
              <span className="block text-xs text-blue-700 mt-0.5">
                Un seul animateur·rice par groupe. Vous pourrez quitter et changer de groupe ensuite.
              </span>
            </span>
          </label>
        )}
        {/* ⬆️ FIN INSERTION ⬆️ */}

        {userType === 'student' && (
          <p className="text-xs text-blue-700 mt-1">
            Vous ne pouvez pas rejoindre un groupe qui a déjà son animateur·rice.
          </p>
        )}
      </div>

      {inscriptionOuverte && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupes.map(g => {
            const canJoin = peutRejoindre(g);
            const full = userType === 'student' && g.capacite_max && g.elevesCount >= g.capacite_max;
            return (
              <div
                key={g.id}
                className={`border rounded-lg p-4 ${canJoin ? 'bg-white hover:border-red-300 cursor-pointer' : 'bg-gray-50 opacity-60'}`}
                onClick={() => canJoin && rejoindre(g.id)}
              >
                <div className="flex justify-between mb-2">
                  <div className="font-bold text-gray-900">{g.nom}</div>
                  <div className="text-xs text-gray-500">
                    {g.localisation_fixe?.id || '—'}
                    {g.localisation_fixe?.etage && ` • É${g.localisation_fixe.etage}`}
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-gray-600">
                  <span>👤 {g.elevesCount}{g.capacite_max ? `/${g.capacite_max}` : ''}</span>
                  <span>👨‍🏫 {g.employesCount}</span>
                </div>
                {userType === 'student' && g.aDejaUnManuel && (
                  <div className="mt-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1">
                    👑 Ce groupe a déjà son animateur·rice
                  </div>
                )}
                {canJoin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); rejoindre(g.id); }}
                    className="mt-3 w-full px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >Rejoindre</button>
                )}
                {full && <div className="mt-2 text-xs text-gray-500">Complet</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}