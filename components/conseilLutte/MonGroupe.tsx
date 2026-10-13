// /components/conseilLutte/MonGroupe.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ChoisirGroupe from './ChoisirGroupe';
import { chargerAnimateursPhase } from '@/lib/conseilLutte/animateurs';

interface Props {
  phaseId: string;
  userType: 'employee' | 'student';
  userId: string;
}

const PHASES_FREINET = [
  { key: 'informer', label: 'I — Informer', couleur: 'bg-blue-100 text-blue-800 border-blue-300' },
  { key: 'proposer', label: 'II — Proposer', couleur: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { key: 'discuter', label: 'III — Discuter', couleur: 'bg-amber-100 text-amber-800 border-amber-300' },
  { key: 'decider',  label: 'IV — Décider', couleur: 'bg-orange-100 text-orange-800 border-orange-300' },
  { key: 'mandater', label: 'V — Mandater', couleur: 'bg-red-100 text-red-800 border-red-300' },
];

export default function MonGroupe({ phaseId, userType, userId }: Props) {
  const [phase, setPhase] = useState<any>(null);
  const [groupe, setGroupe] = useState<any>(null);
  const [local, setLocal] = useState<any>(null);
  const [membres, setMembres] = useState<any[]>([]);
  const [animateursMatricules, setAnimateursMatricules] = useState<number[]>([]);
  const [soutienOuvert, setSoutienOuvert] = useState<any>(null);
  const [mandats, setMandats] = useState<any[]>([]);
  const [presences, setPresences] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingPresence, setSavingPresence] = useState(false);

  // Vote
  const [votePour, setVotePour] = useState<number | ''>('');
  const [savingVote, setSavingVote] = useState(false);

  // Formulaire soutien
  const [showSoutienModal, setShowSoutienModal] = useState(false);
  const [messageSoutien, setMessageSoutien] = useState('');

  // Formulaire mandat
  const [showMandatModal, setShowMandatModal] = useState(false);
  const [nouveauMandat, setNouveauMandat] = useState({ mandat: '', description: '' });
  const [elevesSelectionnes, setElevesSelectionnes] = useState<number[]>([]);

  useEffect(() => { loadData(); }, [phaseId, userId, tick]);

  useEffect(() => {
    if (groupe) {
      setVotePour(groupe.vote_pour ?? '');
    }
  }, [groupe?.id, groupe?.vote_pour]);

  const loadData = async () => {
    setLoading(true);

    // 1. Phase
    const { data: ph } = await supabase
      .from('conseil_lutte_phases').select('*').eq('id', phaseId).single();
    setPhase(ph);

    // 2. Mon groupe
    const { data: membresData } = await supabase
      .from('conseil_lutte_membres')
      .select(`groupe_id, conseil_lutte_groupes!inner (
        id, nom, localisation_id, phase_id, phase_pedagogique, vote_pour,
        localisation_fixe (id, etage)
      )`)
      .eq('participant_id', userId)
      .eq('participant_type', userType)
      .eq('conseil_lutte_groupes.phase_id', phaseId);

    const rawGroupe = membresData?.[0]?.conseil_lutte_groupes as any;
    const groupeData: any = Array.isArray(rawGroupe) ? rawGroupe[0] ?? null : rawGroupe;

    if (!groupeData) {
      setGroupe(null);
      setLoading(false);
      return;
    }
    setGroupe(groupeData);

    const rawLocal = groupeData.localisation_fixe;
    setLocal(Array.isArray(rawLocal) ? rawLocal[0] ?? null : rawLocal);

    // 3. Membres
    const { data: allMembres } = await supabase
      .from('conseil_lutte_membres')
      .select('participant_id, participant_type, manuel')
      .eq('groupe_id', groupeData.id);

    const elevesIds: number[] = [];
    const employesIds: string[] = [];
    (allMembres || []).forEach(m => {
      if (m.participant_type === 'student') elevesIds.push(parseInt(m.participant_id));
      else employesIds.push(m.participant_id);
    });

    const [elevesRes, employesRes] = await Promise.all([
      elevesIds.length > 0
        ? supabase.from('students').select('matricule, nom, prenom, classe').in('matricule', elevesIds)
        : Promise.resolve({ data: [] as any[] }),
      employesIds.length > 0
        ? supabase.from('employees').select('id, nom, prenom, job, initiale').in('id', employesIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const eleves = (elevesRes.data || []).map((s: any) => ({
      id: s.matricule.toString(), matricule: s.matricule,
      type: 'student', nom: s.nom, prenom: s.prenom, classe: s.classe,
    }));
    const employes = (employesRes.data || []).map((e: any) => ({
      id: e.id, type: 'employee', nom: e.nom, prenom: e.prenom,
      classe: e.job === 'educ' ? 'Éducateur' : 'Prof',
    }));

    const tous = [...employes, ...eleves].sort((a, b) => {
      if (a.type === 'employee' && b.type !== 'employee') return -1;
      if (a.type !== 'employee' && b.type === 'employee') return 1;
      if (a.type === 'student' && b.type === 'student' && a.classe !== b.classe) {
        return a.classe.localeCompare(b.classe);
      }
      return a.nom.localeCompare(b.nom);
    });
    setMembres(tous);

    // 4. Animateurs de la phase, croisés avec les membres du groupe
    const animSet = await chargerAnimateursPhase(phaseId);
    const animateursDuGroupe = eleves
      .filter(e => animSet.has(e.matricule))
      .map(e => e.matricule);
    setAnimateursMatricules(animateursDuGroupe);

    // 5. Soutien ouvert
    const { data: soutien } = await supabase
      .from('conseil_lutte_soutiens')
      .select('*')
      .eq('groupe_id', groupeData.id)
      .eq('statut', 'ouvert')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSoutienOuvert(soutien);

    // 6. Mandats
    const { data: mds } = await supabase
      .from('conseil_lutte_mandats')
      .select('*')
      .eq('groupe_id', groupeData.id)
      .order('created_at', { ascending: false });
    setMandats(mds || []);

    // 7. Présences
    const { data: pres } = await supabase
      .from('conseil_lutte_presences')
      .select('student_matricule, present')
      .eq('groupe_id', groupeData.id);

    const presenceMap = new Map<number, boolean>();
    eleves.forEach(e => presenceMap.set(e.matricule, false));
    (pres || []).forEach(p => presenceMap.set(p.student_matricule, p.present));
    setPresences(presenceMap);

    setLoading(false);
  };

  const quitterGroupe = async () => {
    if (!groupe) return;
    if (!confirm('Quitter ce groupe ? Vous pourrez en rejoindre un autre. Votre déclaration animateur·rice sera conservée.')) return;

    setSaving(true);
    try {
      await supabase
        .from('conseil_lutte_membres')
        .delete()
        .eq('groupe_id', groupe.id)
        .eq('participant_id', userId)
        .eq('participant_type', userType);

      setSaving(false);
      setTick(t => t + 1);
    } catch (e: any) {
      alert('Erreur : ' + (e?.message || e));
      setSaving(false);
    }
  };

  const changerPhaseFreinet = async (nouvellePhase: string) => {
    if (!groupe) return;
    setSaving(true);
    const { error } = await supabase
      .from('conseil_lutte_groupes')
      .update({
        phase_pedagogique: nouvellePhase,
        phase_pedagogique_updated_at: new Date().toISOString(),
        phase_pedagogique_updated_by: userId,
      })
      .eq('id', groupe.id);
    setSaving(false);
    if (!error) setGroupe({ ...groupe, phase_pedagogique: nouvellePhase });
  };

  const demanderSoutien = async () => {
    if (!groupe) return;
    setSaving(true);
    const { error } = await supabase.from('conseil_lutte_soutiens').insert({
      groupe_id: groupe.id,
      demandeur_id: userId,
      demandeur_type: userType,
      message: messageSoutien || null,
      statut: 'ouvert',
    });
    setSaving(false);
    if (!error) {
      setShowSoutienModal(false);
      setMessageSoutien('');
      setTick(t => t + 1);
    } else {
      alert('Erreur : ' + error.message);
    }
  };

  const annulerSoutien = async () => {
    if (!soutienOuvert) return;
    if (!confirm('Annuler la demande de soutien ?')) return;
    setSaving(true);
    await supabase.from('conseil_lutte_soutiens')
      .update({ statut: 'annule', traite_at: new Date().toISOString(), traite_par: userId })
      .eq('id', soutienOuvert.id);
    setSaving(false);
    setTick(t => t + 1);
  };

  const creerMandat = async () => {
    if (!groupe || !nouveauMandat.mandat.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('conseil_lutte_mandats').insert({
      groupe_id: groupe.id,
      mandat: nouveauMandat.mandat.trim(),
      description: nouveauMandat.description.trim() || null,
      eleves: elevesSelectionnes,
      created_by: userId,
    });
    setSaving(false);
    if (!error) {
      setShowMandatModal(false);
      setNouveauMandat({ mandat: '', description: '' });
      setElevesSelectionnes([]);
      setTick(t => t + 1);
    } else {
      alert('Erreur : ' + error.message);
    }
  };

  const supprimerMandat = async (id: string) => {
    if (!confirm('Supprimer ce mandat ?')) return;
    await supabase.from('conseil_lutte_mandats').delete().eq('id', id);
    setTick(t => t + 1);
  };

  const togglePresence = async (matricule: number) => {
    if (!groupe) return;
    const nouvelle = !presences.get(matricule);
    const newMap = new Map(presences); newMap.set(matricule, nouvelle); setPresences(newMap);

    setSavingPresence(true);
    const { error } = await supabase.from('conseil_lutte_presences').upsert({
      groupe_id: groupe.id,
      student_matricule: matricule,
      present: nouvelle,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'groupe_id,student_matricule' });
    if (error) {
      const rollback = new Map(presences); rollback.set(matricule, !nouvelle); setPresences(rollback);
    }
    setSavingPresence(false);
  };

  const bulkPresence = async (present: boolean) => {
    if (!groupe) return;
    const elevesListe = membres.filter(m => m.type === 'student');
    if (elevesListe.length === 0) return;
    if (!confirm(`Marquer les ${elevesListe.length} élèves comme ${present ? 'PRÉSENTS' : 'ABSENTS'} ?`)) return;

    setSavingPresence(true);
    const newMap = new Map(presences);
    elevesListe.forEach(e => newMap.set(e.matricule, present));
    setPresences(newMap);

    const upserts = elevesListe.map(e => ({
      groupe_id: groupe.id,
      student_matricule: e.matricule,
      present,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('conseil_lutte_presences')
      .upsert(upserts, { onConflict: 'groupe_id,student_matricule' });
    if (error) await loadData();
    setSavingPresence(false);
  };

  const enregistrerVote = async () => {
    if (!groupe) return;
    if (votePour === '') {
      alert('Entrez le nombre de voix pour.');
      return;
    }
    const totalPresents = membres.filter(m => m.type === 'student').filter(e => presences.get(e.matricule)).length;
    if (totalPresents === 0) {
      alert('Aucun élève présent dans le groupe. Prenez les présences avant d\'enregistrer le vote.');
      return;
    }
    if (votePour > totalPresents) {
      if (!confirm(
        `Le nombre de voix pour (${votePour}) dépasse le nombre de présents (${totalPresents}).\n\nConfirmer ?`
      )) return;
    }
    setSavingVote(true);
    const { error } = await supabase
      .from('conseil_lutte_groupes')
      .update({ vote_pour: votePour })
      .eq('id', groupe.id);
    setSavingVote(false);
    if (!error) {
      setGroupe({ ...groupe, vote_pour: votePour });
    } else {
      alert('Erreur : ' + error.message);
    }
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  if (!groupe) {
    return (
      <ChoisirGroupe
        phaseId={phaseId}
        phase={phase}
        userType={userType}
        userId={userId}
        onJoined={() => setTick(t => t + 1)}
      />
    );
  }

  const estAnimateur = userType === 'student' && animateursMatricules.includes(parseInt(userId));
  const phaseFreinetActuelle = groupe.phase_pedagogique || null;
  const infoPhase = PHASES_FREINET.find(p => p.key === phaseFreinetActuelle);

  const eleves = membres.filter(m => m.type === 'student');
  const elevesPresents = eleves.filter(e => presences.get(e.matricule));
  const nbPresents = elevesPresents.length;

  return (
    <div className="space-y-6">

      {/* En-tête groupe */}
      <div className="bg-white rounded-lg border-2 border-red-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase text-red-600 font-semibold tracking-wide mb-1">
              Votre groupe
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{groupe.nom}</h2>
            {(estAnimateur || userType === 'employee') && (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {estAnimateur && (
                  <span className="inline-block text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium">
                    👑 Vous êtes animateur·rice de ce groupe
                  </span>
                )}
                <button
                  onClick={quitterGroupe}
                  disabled={saving}
                  className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
                >
                  Quitter le groupe
                </button>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-gray-500 font-semibold">Local</div>
            <div className="text-2xl font-bold text-gray-900">
              {local?.id || groupe.localisation_id || '—'}
            </div>
            {local?.etage && <div className="text-xs text-gray-500">Étage {local.etage}</div>}
          </div>
        </div>
        {phase && (
          <div className="text-sm text-gray-600 border-t pt-3">
            ⏰ {phase.heure_debut} – {phase.heure_fin} — {phase.nom}
          </div>
        )}
      </div>

      {/* Phase Freinet */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Étape en cours</h3>
        <p className="text-sm text-gray-500 mb-4">
          Où en êtes-vous collectivement dans la délibération ?
        </p>
        <div className="flex flex-wrap gap-2">
          {PHASES_FREINET.map(p => (
            <button
              key={p.key}
              onClick={() => changerPhaseFreinet(p.key)}
              disabled={saving}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                phaseFreinetActuelle === p.key
                  ? `${p.couleur} ring-2 ring-offset-1`
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              } disabled:opacity-50`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {infoPhase && (
          <div className={`mt-3 text-xs px-3 py-2 rounded ${infoPhase.couleur}`}>
            Phase actuelle : <strong>{infoPhase.label}</strong>
          </div>
        )}
      </div>

      {/* Vote — saisie (animateur·rice + encadrant·e) */}
      {(estAnimateur || userType === 'employee') && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Résultat du vote</h3>
          <p className="text-sm text-gray-500 mb-4">
            Saisissez le nombre de voix pour. Le nombre de votants correspond aux présents
            dans le groupe (animateurs compris).
          </p>

          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Voix pour</label>
              <input
                type="number"
                min={0}
                value={votePour}
                onChange={(e) => setVotePour(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-24 px-3 py-2 border rounded-lg"
                placeholder="0"
              />
            </div>
            <div className="pt-6">
              <span className="text-sm text-gray-600">
                sur <strong>{nbPresents}</strong> présent·e·s
              </span>
            </div>
          </div>

          {votePour !== '' && (
            <div className="text-sm text-gray-600 mb-4">
              → <strong>{votePour}</strong> pour ·{' '}
              <strong>{Math.max(0, nbPresents - votePour)}</strong> contre ·{' '}
              <strong>{nbPresents}</strong> votants
            </div>
          )}

          <button
            onClick={enregistrerVote}
            disabled={savingVote}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {savingVote ? 'Enregistrement…' : 'Enregistrer le vote'}
          </button>
        </div>
      )}

      {/* Vote — lecture seule (élève non animateur, si un vote existe) */}
      {!estAnimateur && userType === 'student' && groupe.vote_pour != null && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Résultat du vote</h3>
          <p className="text-sm text-gray-700">
            🗳️ <strong>{groupe.vote_pour}</strong> pour ·{' '}
            <strong>{Math.max(0, nbPresents - groupe.vote_pour)}</strong> contre ·{' '}
            <strong>{nbPresents}</strong> votants
          </p>
        </div>
      )}

      {/* Soutien */}
      {(() => {
        const jeSuisEncadrant = userType === 'employee';
        const jeSuisAnimateur = estAnimateur;
        const jePeuxDemander = jeSuisEncadrant || jeSuisAnimateur;

        let mode: 'aucune' | 'memeCamp' | 'campOppose' | 'rien';
        if (!soutienOuvert) {
          mode = jePeuxDemander ? 'aucune' : 'rien';
        } else {
          const demType = soutienOuvert.demandeur_type;
          const memeCamp =
            (jeSuisEncadrant && demType === 'employee') ||
            (jeSuisAnimateur && demType === 'student');
          const campOppose =
            (jeSuisEncadrant && demType === 'student') ||
            (jeSuisAnimateur && demType === 'employee');
          mode = memeCamp ? 'memeCamp' : (campOppose ? 'campOppose' : 'rien');
        }

        return (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Soutien</h3>
            <p className="text-sm text-gray-600 mb-3">
              En cas de tension ou de dérapage, demandez l'aide d'un tiers.
            </p>

            {mode === 'memeCamp' && (
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-red-800">
                    🆘 Demande de soutien en cours
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    Émise par {soutienOuvert.demandeur_type === 'student' ? "l'animateur·rice" : "un·e encadrant·e"}
                    {soutienOuvert.message && ` — « ${soutienOuvert.message} »`}
                  </div>
                </div>
                <button
                  onClick={annulerSoutien}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs bg-white border border-red-300 text-red-700 rounded hover:bg-red-100 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            )}

            {(mode === 'aucune' || mode === 'campOppose') && (
              <button
                onClick={() => setShowSoutienModal(true)}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                🆘 Demander un soutien
              </button>
            )}

            {mode === 'rien' && (
              <div className="text-sm text-gray-500">
                Seul·e l'animateur·rice ou un·e encadrant·e peut demander un soutien.
              </div>
            )}
          </div>
        );
      })()}

      {/* Mandats (phase V) */}
      {phaseFreinetActuelle === 'mandater' && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mandats</h3>
              <p className="text-sm text-gray-500">
                {estAnimateur
                  ? 'Vous pouvez créer des mandats (rôles confiés à des élèves).'
                  : 'Seul·e l\'animateur·rice peut créer des mandats.'}
              </p>
            </div>
            {estAnimateur && (
              <button
                onClick={() => setShowMandatModal(true)}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                + Nouveau mandat
              </button>
            )}
          </div>

          {mandats.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">
              Aucun mandat pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {mandats.map(m => {
                const elevesDuMandat = (m.eleves || [])
                  .map((id: number) => eleves.find(e => e.matricule === id))
                  .filter(Boolean);
                return (
                  <div key={m.id} className="border rounded-lg p-4 bg-purple-50/40">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-900">{m.mandat}</div>
                        {m.description && (
                          <div className="text-sm text-gray-600 mt-1">{m.description}</div>
                        )}
                        {elevesDuMandat.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            Mandaté·e·s :{' '}
                            {elevesDuMandat.map((e: any) => `${e.prenom} ${e.nom}`).join(', ')}
                          </div>
                        )}
                      </div>
                      {estAnimateur && (
                        <button
                          onClick={() => supprimerMandat(m.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Membres + prise de présences */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Membres du groupe ({membres.length})
            </h3>
            {userType === 'employee' && eleves.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {nbPresents}/{eleves.length} présent·e·s — cliquez sur un élève pour changer son statut.
              </p>
            )}
          </div>
          {userType === 'employee' && eleves.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => bulkPresence(true)}
                disabled={savingPresence}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Tout présent
              </button>
              <button
                onClick={() => bulkPresence(false)}
                disabled={savingPresence}
                className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Tout absent
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {membres.map(m => {
            const isMe = m.id === userId &&
              ((userType === 'student' && m.type === 'student') ||
               (userType === 'employee' && m.type === 'employee'));
            const isAnimateur = m.type === 'student' && animateursMatricules.includes(m.matricule);
            const present = m.type === 'student' ? (presences.get(m.matricule) || false) : false;

            return (
              <div
                key={`${m.type}-${m.id}`}
                className={`flex items-center justify-between p-2 rounded ${
                  isMe ? 'bg-red-50 border border-red-200' :
                  isAnimateur ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">
                    {m.type === 'employee' ? '👨‍🏫' : (isAnimateur ? '👑' : '👤')}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-sm truncate ${isMe ? 'font-semibold' : ''}`}>
                      {m.prenom} {m.nom}
                      {isMe && ' (moi)'}
                      {isAnimateur && ' · animateur·rice'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {m.type === 'employee' ? m.classe : `Classe ${m.classe}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {userType === 'employee' && m.type === 'student' && (
                    <button
                      onClick={() => togglePresence(m.matricule)}
                      disabled={savingPresence}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm transition-colors ${
                        present
                          ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200'
                      } disabled:opacity-50`}
                      title={present ? 'Marquer absent' : 'Marquer présent'}
                    >
                      {present ? '✓' : '✕'}
                    </button>
                  )}
                  {userType === 'student' && m.type === 'student' && (
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      present
                        ? 'bg-green-100 border border-green-300 text-green-700'
                        : 'bg-red-100 border border-red-300 text-red-700'
                    }`}>
                      {present ? '✓' : '✕'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal soutien */}
      {showSoutienModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-3">Demande de soutien</h3>
            <p className="text-sm text-gray-600 mb-3">
              Expliquez brièvement la situation. L'administration sera alertée.
            </p>
            <textarea
              value={messageSoutien}
              onChange={(e) => setMessageSoutien(e.target.value)}
              rows={4}
              placeholder="Décrivez ce qui se passe…"
              className="w-full px-3 py-2 border rounded text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowSoutienModal(false); setMessageSoutien(''); }}
                className="px-4 py-2 border rounded text-sm"
              >
                Annuler
              </button>
              <button
                onClick={demanderSoutien}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Envoi…' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal mandat */}
      {showMandatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Nouveau mandat</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Intitulé du mandat</label>
                <input
                  value={nouveauMandat.mandat}
                  onChange={(e) => setNouveauMandat({ ...nouveauMandat, mandat: e.target.value })}
                  placeholder="Ex. : Porte-parole auprès de la direction"
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Description (optionnel)</label>
                <textarea
                  value={nouveauMandat.description}
                  onChange={(e) => setNouveauMandat({ ...nouveauMandat, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Élèves mandatés ({elevesSelectionnes.length} sélectionné·e·s)
                </label>
                <div className="max-h-60 overflow-y-auto border rounded p-2 space-y-1">
                  {eleves.map(e => (
                    <label key={e.matricule} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={elevesSelectionnes.includes(e.matricule)}
                        onChange={(ev) => {
                          setElevesSelectionnes(prev =>
                            ev.target.checked
                              ? [...prev, e.matricule]
                              : prev.filter(x => x !== e.matricule)
                          );
                        }}
                      />
                      {e.prenom} {e.nom} <span className="text-gray-400 text-xs">({e.classe})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowMandatModal(false);
                  setNouveauMandat({ mandat: '', description: '' });
                  setElevesSelectionnes([]);
                }}
                className="px-4 py-2 border rounded text-sm"
              >
                Annuler
              </button>
              <button
                onClick={creerMandat}
                disabled={saving || !nouveauMandat.mandat.trim()}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Créer le mandat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}