// /components/conseilLutte/VueEducatrices.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  phaseId: string;
  phase?: any;
  userId: string;
}

interface EleveAvecStatut {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  niveau: string;
  groupeId: string | null;
  groupeNom: string | null;
  localisationId: string | null;
  etage: string | null;
  present: boolean;
}

export default function VueEducatrices({ phaseId, phase, userId }: Props) {
  const [eleves, setEleves] = useState<EleveAvecStatut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Accordéon : quels niveaux et quelles classes sont ouverts
  const [niveauxOuverts, setNiveauxOuverts] = useState<Set<string>>(new Set());
  const [classesOuvertes, setClassesOuvertes] = useState<Set<string>>(new Set());

  // Modal de confirmation
  const [pendingChange, setPendingChange] = useState<{
    eleve: EleveAvecStatut;
    nouveauStatut: boolean;
  } | null>(null);

  // Filtre
  const [recherche, setRecherche] = useState('');

  useEffect(() => { loadAll(); }, [phaseId]);

  const loadAll = async () => {
    setLoading(true);

    // 1. Groupes de la phase
    const { data: groupes } = await supabase
      .from('conseil_lutte_groupes')
      .select(`id, nom, localisation_id, localisation_fixe (id, etage)`)
      .eq('phase_id', phaseId);

    const groupesMap: Record<string, any> = {};
    (groupes || []).forEach(g => {
      const lf = Array.isArray(g.localisation_fixe) ? g.localisation_fixe[0] : g.localisation_fixe;
      groupesMap[g.id] = { nom: g.nom, localisation_id: g.localisation_id, etage: lf?.etage };
    });

    const groupeIds = (groupes || []).map(g => g.id);

    // 2. Membres (élèves) de ces groupes
    const membresParEleve: Record<number, any> = {};
    if (groupeIds.length > 0) {
      const { data: mbs } = await supabase
        .from('conseil_lutte_membres')
        .select('groupe_id, participant_id')
        .in('groupe_id', groupeIds)
        .eq('participant_type', 'student');
      (mbs || []).forEach(m => {
        membresParEleve[parseInt(m.participant_id)] = {
          groupe_id: m.groupe_id,
          groupe_nom: groupesMap[m.groupe_id]?.nom ?? null,
          localisation_id: groupesMap[m.groupe_id]?.localisation_id ?? null,
          etage: groupesMap[m.groupe_id]?.etage ?? null,
        };
      });
    }

    // 3. Tous les students concernés (ceux qui sont dans un groupe de la phase)
    const matricules = Object.keys(membresParEleve).map(Number);
    if (matricules.length === 0) {
      setEleves([]);
      setLoading(false);
      return;
    }

    const { data: students } = await supabase
      .from('students')
      .select('matricule, nom, prenom, classe, niveau')
      .in('matricule', matricules);

    // 4. Présences
    const { data: pres } = await supabase
      .from('conseil_lutte_presences')
      .select('groupe_id, student_matricule, present')
      .in('groupe_id', groupeIds);

    const presenceMap = new Map<string, boolean>();
    (pres || []).forEach(p => {
      presenceMap.set(`${p.groupe_id}_${p.student_matricule}`, p.present);
    });

    // 5. Fusion
    const liste: EleveAvecStatut[] = (students || []).map(s => {
      const m = membresParEleve[s.matricule];
      const present = m ? (presenceMap.get(`${m.groupe_id}_${s.matricule}`) ?? false) : false;
      return {
        matricule: s.matricule,
        nom: s.nom,
        prenom: s.prenom,
        classe: s.classe || '—',
        niveau: s.niveau || '—',
        groupeId: m?.groupe_id ?? null,
        groupeNom: m?.groupe_nom ?? null,
        localisationId: m?.localisation_id ?? null,
        etage: m?.etage ?? null,
        present,
      };
    }).sort((a, b) => {
      if (a.niveau !== b.niveau) return a.niveau.localeCompare(b.niveau);
      if (a.classe !== b.classe) return a.classe.localeCompare(b.classe);
      return a.nom.localeCompare(b.nom);
    });

    setEleves(liste);
    setLoading(false);
  };

  const demanderChangement = (eleve: EleveAvecStatut) => {
    if (!eleve.groupeId) return;
    setPendingChange({ eleve, nouveauStatut: !eleve.present });
  };

  const confirmerChangement = async () => {
    if (!pendingChange) return;
    const { eleve, nouveauStatut } = pendingChange;
    if (!eleve.groupeId) return;

    setSaving(true);
    const { error } = await supabase.from('conseil_lutte_presences').upsert({
      groupe_id: eleve.groupeId,
      student_matricule: eleve.matricule,
      present: nouveauStatut,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'groupe_id,student_matricule' });

    if (error) {
      alert('Erreur : ' + error.message);
      setSaving(false);
      return;
    }

    // MAJ local optimiste
    setEleves(prev => prev.map(e =>
      e.matricule === eleve.matricule ? { ...e, present: nouveauStatut } : e
    ));
    setSaving(false);
    setPendingChange(null);
  };

  const toggleNiveau = (niveau: string) => {
    const next = new Set(niveauxOuverts);
    if (next.has(niveau)) next.delete(niveau);
    else next.add(niveau);
    setNiveauxOuverts(next);
  };

  const toggleClasse = (niveau: string, classe: string) => {
    const key = `${niveau}::${classe}`;
    const next = new Set(classesOuvertes);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setClassesOuvertes(next);
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  // Filtre recherche
  const q = recherche.trim().toLowerCase();
  const elevesFiltres = q
    ? eleves.filter(e =>
        `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
        e.classe.toLowerCase().includes(q) ||
        e.niveau.toLowerCase().includes(q)
      )
    : eleves;

  // Regroupement niveau → classe
  const parNiveau: Record<string, Record<string, EleveAvecStatut[]>> = {};
  elevesFiltres.forEach(e => {
    if (!parNiveau[e.niveau]) parNiveau[e.niveau] = {};
    if (!parNiveau[e.niveau][e.classe]) parNiveau[e.niveau][e.classe] = [];
    parNiveau[e.niveau][e.classe].push(e);
  });

  const niveauxTries = Object.keys(parNiveau).sort();

  const totalPresents = eleves.filter(e => e.present).length;

  return (
    <div className="space-y-4">

      {/* Barre d'info + recherche */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Présences par classe
            </h2>
            <p className="text-xs text-gray-500">
              {phase?.nom && <>{phase.nom} · </>}
              {totalPresents}/{eleves.length} présents sur cette phase
            </p>
          </div>
          <input
            type="text"
            placeholder="🔍 Élève, classe, niveau…"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm w-full md:w-72"
          />
        </div>
      </div>

      {/* Accordéon niveau → classe → élèves */}
      {niveauxTries.map(niveau => {
        const classes = parNiveau[niveau];
        const elevesDuNiveau = Object.values(classes).flat();
        const presentsNiveau = elevesDuNiveau.filter(e => e.present).length;
        const isNiveauOuvert = niveauxOuverts.has(niveau) || !!q; // auto-ouvre si recherche

        return (
          <div key={niveau} className="bg-white border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleNiveau(niveau)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">
                  {niveau === '—' ? 'Niveau inconnu' : `Niveau ${niveau}`}
                </span>
                <span className="text-xs text-gray-500">
                  {Object.keys(classes).length} classe{Object.keys(classes).length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600">
                  ✓ {presentsNiveau}/{elevesDuNiveau.length}
                </span>
                <span className="text-gray-400">{isNiveauOuvert ? '▲' : '▼'}</span>
              </div>
            </button>

            {isNiveauOuvert && (
              <div className="border-t">
                {Object.keys(classes).sort().map(classe => {
                  const elevesClasse = classes[classe];
                  const presentsClasse = elevesClasse.filter(e => e.present).length;
                  const key = `${niveau}::${classe}`;
                  const isClasseOuverte = classesOuvertes.has(key) || !!q;

                  return (
                    <div key={key} className="border-b last:border-b-0">
                      <button
                        onClick={() => toggleClasse(niveau, classe)}
                        className="w-full px-6 py-2.5 bg-white hover:bg-gray-50 transition flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-800">{classe}</span>
                          <span className="text-xs text-gray-400">
                            {elevesClasse.length} élève{elevesClasse.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-600">
                            ✓ {presentsClasse}/{elevesClasse.length}
                          </span>
                          <span className="text-gray-400">{isClasseOuverte ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isClasseOuverte && (
                        <div className="bg-gray-50/50">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-1.5 text-left text-xs font-medium text-gray-500">Élève</th>
                                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Groupe</th>
                                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Local</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 w-24">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {elevesClasse.map(e => (
                                <tr
                                  key={e.matricule}
                                  className="hover:bg-white cursor-pointer"
                                  onClick={() => demanderChangement(e)}
                                >
                                  <td className="px-6 py-2 text-sm">{e.prenom} {e.nom}</td>
                                  <td className="px-3 py-2 text-xs text-gray-600">
                                    {e.groupeNom || <span className="text-gray-400">—</span>}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-600">
                                    {e.localisationId || <span className="text-gray-400">—</span>}
                                    {e.etage && <span className="text-gray-400"> (É{e.etage})</span>}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                                      e.present
                                        ? 'bg-green-100 text-green-700 border border-green-300'
                                        : 'bg-red-100 text-red-700 border border-red-300'
                                    }`}>
                                      {e.present ? '✓' : '✕'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {niveauxTries.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white border rounded-lg">
          {q ? 'Aucun élève ne correspond à la recherche.' : 'Aucun élève affecté à un groupe pour cette phase.'}
        </div>
      )}

      {/* Modal de confirmation */}
      {pendingChange && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => !saving && setPendingChange(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Confirmer le changement de statut
            </h3>
            <div className="text-sm text-gray-700 space-y-2 mb-4">
              <div>
                <span className="text-gray-500">Élève :</span>{' '}
                <strong>{pendingChange.eleve.prenom} {pendingChange.eleve.nom}</strong>
              </div>
              <div>
                <span className="text-gray-500">Classe :</span> {pendingChange.eleve.classe}
              </div>
              <div>
                <span className="text-gray-500">Groupe :</span> {pendingChange.eleve.groupeNom || '—'}
                {pendingChange.eleve.localisationId && ` (local ${pendingChange.eleve.localisationId})`}
              </div>
              <div className="pt-2 border-t">
                <span className="text-gray-500">Statut actuel :</span>{' '}
                {pendingChange.eleve.present ? 'Présent ✓' : 'Absent ✕'}
                <br />
                <span className="text-gray-500">Nouveau statut :</span>{' '}
                <strong className={pendingChange.nouveauStatut ? 'text-green-700' : 'text-red-700'}>
                  {pendingChange.nouveauStatut ? 'Présent ✓' : 'Absent ✕'}
                </strong>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">
              ⚠️ Vérifiez que le prof encadrant n'a pas déjà pris la présence avant de corriger.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingChange(null)}
                disabled={saving}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmerChangement}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50 ${
                  pendingChange.nouveauStatut ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {saving ? 'Enregistrement…' : `Marquer ${pendingChange.nouveauStatut ? 'présent' : 'absent'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}