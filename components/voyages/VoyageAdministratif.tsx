// components/voyages/VoyageAdministratif.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  voyageId: string;
  isResponsable: boolean;
}

interface Eleve {
  matricule: number;
  nom: string;
  prenom: string;
  classe: string;
  regime_alimentaire: any;
  date_naissance: string | null;
  nationalite: string | null;
}

interface Paiement {
  id: string;
  montant: number;
  date_versement: string;
}

interface Participant {
  id: string;
  eleve_id: number;
  participe: boolean;
  montant_attendu: number | null;
  passport_numero: string | null;
  passport_verifie: boolean;
  visa_numero: string | null;
  visa_verifie: boolean;
  fiche_medicale_url: string | null;
  fiche_medicale_verifiee: boolean;
  carte_mutuelle_url: string | null;
  carte_mutuelle_verifiee: boolean;
  carte_identite_url: string | null;
  carte_identite_verifiee: boolean;
  eleve: Eleve;
  paiements: Paiement[];
}

interface VoyageConfig {
  passport_requis: boolean;
  visa_requis: boolean;
  montant_attendu_defaut: number | null;
}

export default function VoyageAdministratif({ voyageId, isResponsable }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [config, setConfig] = useState<VoyageConfig>({
    passport_requis: false,
    visa_requis: false,
    montant_attendu_defaut: null,
  });
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    loadAll();
  }, [voyageId]);

  const loadAll = async () => {
    setLoading(true);

    const { data: voyageData } = await supabase
      .from('voyages')
      .select('passport_requis, visa_requis, montant_attendu_defaut')
      .eq('id', voyageId)
      .single();

    if (voyageData) setConfig(voyageData);

    const { data: partsData } = await supabase
      .from('voyage_participants')
      .select(`
        id, eleve_id, participe, montant_attendu,
        passport_numero, passport_verifie,
        visa_numero, visa_verifie,
        fiche_medicale_url, fiche_medicale_verifiee,
        carte_mutuelle_url, carte_mutuelle_verifiee,
        carte_identite_url, carte_identite_verifiee,
        eleve:students!inner(
          matricule, nom, prenom, classe,
          regime_alimentaire, date_naissance, nationalite
        )
      `)
      .eq('voyage_id', voyageId);

    if (!partsData) {
      setLoading(false);
      return;
    }

    const participantIds = partsData.map((p: any) => p.id);
    const { data: paiementsData } = await supabase
      .from('voyage_paiements')
      .select('id, voyage_participant_id, montant, date_versement')
      .in('voyage_participant_id', participantIds);

    const paiementsParParticipant = new Map<string, Paiement[]>();
    (paiementsData || []).forEach((p: any) => {
      const list = paiementsParParticipant.get(p.voyage_participant_id) || [];
      list.push({ id: p.id, montant: p.montant, date_versement: p.date_versement });
      paiementsParParticipant.set(p.voyage_participant_id, list);
    });

    const enriched: Participant[] = partsData.map((p: any) => ({
      ...p,
      eleve: Array.isArray(p.eleve) ? p.eleve[0] : p.eleve,
      paiements: paiementsParParticipant.get(p.id) || [],
    }));

    setParticipants(enriched);
    setLoading(false);
  };

  const getTotalPaye = (p: Participant) =>
    p.paiements.reduce((sum, v) => sum + Number(v.montant), 0);

  const estComplet = (p: Participant): boolean => {
    if (!p.participe) return false;
    if (config.passport_requis && (!p.passport_numero || !p.passport_verifie)) return false;
    if (config.visa_requis && (!p.visa_numero || !p.visa_verifie)) return false;
    if (!p.fiche_medicale_url || !p.fiche_medicale_verifiee) return false;
    if (!p.carte_mutuelle_url || !p.carte_mutuelle_verifiee) return false;
    if (!p.carte_identite_url || !p.carte_identite_verifiee) return false;
    if (config.montant_attendu_defaut != null) {
      if (getTotalPaye(p) < config.montant_attendu_defaut) return false;
    }
    return true;
  };

  const saveConfig = async (key: keyof VoyageConfig, value: any) => {
    const { error } = await supabase
      .from('voyages')
      .update({ [key]: value })
      .eq('id', voyageId);
    if (!error) setConfig({ ...config, [key]: value });
  };

    const sortedParticipants = [...participants].sort((a, b) => {
    const aComplet = estComplet(a);
    const bComplet = estComplet(b);
    if (aComplet !== bComplet) return aComplet ? -1 : 1;
    
    const classeA = a.eleve.classe || '';
    const classeB = b.eleve.classe || '';
    if (classeA !== classeB) return classeA.localeCompare(classeB);
    
    return (a.eleve.nom || '').localeCompare(b.eleve.nom || '');
    });

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  if (!isResponsable) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès réservé</h3>
        <p className="text-gray-600">Seuls les responsables peuvent accéder au suivi administratif.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Config du voyage */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Configuration administrative du voyage</h2>
        <div className="flex flex-wrap gap-6 items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.passport_requis}
              onChange={(e) => saveConfig('passport_requis', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Passeport requis</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.visa_requis}
              onChange={(e) => saveConfig('visa_requis', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Visa requis</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Montant par défaut (€) :</label>
            <input
              type="number"
              min="0"
              step="0.01"
              defaultValue={config.montant_attendu_defaut ?? ''}
              onBlur={(e) => saveConfig('montant_attendu_defaut', e.target.value ? Number(e.target.value) : null)}
              className="w-24 px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tableau administratif */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-3 py-2">État</th>
              <th className="px-3 py-2">Élève</th>
              <th className="px-3 py-2">Classe</th>
              <th className="px-3 py-2 text-center">Régime</th>
              <th className="px-3 py-2 text-center">Passeport</th>
              <th className="px-3 py-2 text-center">Visa</th>
              <th className="px-3 py-2 text-center">Fiche méd.</th>
              <th className="px-3 py-2 text-center">Carte mut.</th>
              <th className="px-3 py-2 text-center">Carte ID</th>
              <th className="px-3 py-2 text-center">Paiement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedParticipants.map((p) => {
              const complet = estComplet(p);
              const totalPaye = getTotalPaye(p);
              const regime = typeof p.eleve.regime_alimentaire === 'object' && p.eleve.regime_alimentaire !== null
                ? p.eleve.regime_alimentaire.regime
                : 'Omnivore';

              const Dot = ({ status, title }: { status: 'ok' | 'warning' | 'missing'; title?: string }) => (
                <span
                  title={title}
                  className={`inline-block w-3 h-3 rounded-full ${
                    status === 'ok' ? 'bg-green-500' :
                    status === 'warning' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                />
              );

              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedParticipant(p)}
                  className={`cursor-pointer hover:bg-blue-50 ${complet ? '' : 'bg-orange-50'}`}
                >
                  <td className="px-3 py-2">
                    {complet ? (
                      <span className="text-green-600 font-bold" title="Complet">✅</span>
                    ) : (
                      <span className="text-orange-500 font-bold" title="Incomplet">⚠️</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {p.eleve.nom} {p.eleve.prenom}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{p.eleve.classe}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    {regime === 'Omnivore' ? '🍖' : regime === 'Végétarien' ? '🥬' : regime === 'Halal' ? '🕌' : regime}
                  </td>

                  {/* Passeport */}
                  <td className="px-3 py-2 text-center">
                    {config.passport_requis ? (
                      <Dot
                        status={
                          !p.passport_numero ? 'missing' :
                          !p.passport_verifie ? 'warning' :
                          'ok'
                        }
                        title={
                          !p.passport_numero ? 'Non renseigné' :
                          !p.passport_verifie ? 'À vérifier' :
                          'Vérifié'
                        }
                      />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Visa */}
                  <td className="px-3 py-2 text-center">
                    {config.visa_requis ? (
                      <Dot
                        status={
                          !p.visa_numero ? 'missing' :
                          !p.visa_verifie ? 'warning' :
                          'ok'
                        }
                        title={
                          !p.visa_numero ? 'Non renseigné' :
                          !p.visa_verifie ? 'À vérifier' :
                          'Vérifié'
                        }
                      />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Fiche médicale */}
                  <td className="px-3 py-2 text-center">
                    <Dot
                      status={
                        !p.fiche_medicale_url ? 'missing' :
                        !p.fiche_medicale_verifiee ? 'warning' :
                        'ok'
                      }
                      title={
                        !p.fiche_medicale_url ? 'Manquante' :
                        !p.fiche_medicale_verifiee ? 'À vérifier' :
                        'Vérifiée'
                      }
                    />
                  </td>

                  {/* Carte mutuelle */}
                  <td className="px-3 py-2 text-center">
                    <Dot
                      status={
                        !p.carte_mutuelle_url ? 'missing' :
                        !p.carte_mutuelle_verifiee ? 'warning' :
                        'ok'
                      }
                      title={
                        !p.carte_mutuelle_url ? 'Manquante' :
                        !p.carte_mutuelle_verifiee ? 'À vérifier' :
                        'Vérifiée'
                      }
                    />
                  </td>

                  {/* Carte identité */}
                  <td className="px-3 py-2 text-center">
                    <Dot
                      status={
                        !p.carte_identite_url ? 'missing' :
                        !p.carte_identite_verifiee ? 'warning' :
                        'ok'
                      }
                      title={
                        !p.carte_identite_url ? 'Manquante' :
                        !p.carte_identite_verifiee ? 'À vérifier' :
                        'Vérifiée'
                      }
                    />
                  </td>

                  {/* Paiement */}
                  <td className="px-3 py-2 text-center text-xs font-mono">
                    {(() => {
                      const attendu = config.montant_attendu_defaut;

                      if (attendu == null) {
                        return <span className="text-gray-500">{totalPaye}€</span>;
                      }

                      if (totalPaye === attendu) {
                        return (
                          <span className="text-green-600 font-bold" title="Montant complet">
                            🟢 {totalPaye}€
                          </span>
                        );
                      }

                      if (totalPaye < attendu) {
                        return (
                          <span className="text-red-600 font-bold" title={`Reste ${attendu - totalPaye}€ à payer`}>
                            🔴 {totalPaye}/{attendu}€
                          </span>
                        );
                      }

                      return (
                        <span className="text-orange-500 font-bold" title={`Trop-perçu de ${totalPaye - attendu}€ — à rembourser`}>
                          ⚠️ {totalPaye}/{attendu}€
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedParticipants.length === 0 && (
          <p className="text-center py-8 text-gray-500">Aucun élève participant pour le moment.</p>
        )}
      </div>

      {/* Modal fiche élève */}
      {selectedParticipant && (
        <FicheEleveAdmin
          voyageId={voyageId}
          participant={selectedParticipant}
          config={config}
          onClose={() => setSelectedParticipant(null)}
          onUpdate={loadAll}
        />
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Composant Section 
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  id,
  sectionEdition,
  onEdit,
  onCancel,
  children,
  editContent,
}: {
  title: string;
  id: string;
  sectionEdition: string | null;
  onEdit: (id: string) => void;
  onCancel: () => void;
  children: React.ReactNode;
  editContent: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {sectionEdition === id ? (
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Annuler
          </button>
        ) : (
          <button
            onClick={() => onEdit(id)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            ✏️ Modifier
          </button>
        )}
      </div>
      {sectionEdition === id ? editContent : children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal "Fiche élève"
// ─────────────────────────────────────────────────────────────────────────────

function FicheEleveAdmin({
  voyageId,
  participant,
  config,
  onClose,
  onUpdate,
}: {
  voyageId: string;
  participant: Participant;
  config: VoyageConfig;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [sectionEdition, setSectionEdition] = useState<string | null>(null);
  const [showAddPaiement, setShowAddPaiement] = useState(false);

  // ── Copies locales (option B) ──────────────────────────────────────────
  const [passport, setPassport] = useState({
    numero: participant.passport_numero || '',
    verifie: participant.passport_verifie,
  });
  const [visa, setVisa] = useState({
    numero: participant.visa_numero || '',
    verifie: participant.visa_verifie,
  });
  const [etatCivil, setEtatCivil] = useState({
    date_naissance: participant.eleve.date_naissance,
    nationalite: participant.eleve.nationalite,
  });
  const [paiements, setPaiements] = useState<Paiement[]>(participant.paiements);
  const [documents, setDocuments] = useState({
    fiche_medicale_url: participant.fiche_medicale_url,
    fiche_medicale_verifiee: participant.fiche_medicale_verifiee,
    carte_mutuelle_url: participant.carte_mutuelle_url,
    carte_mutuelle_verifiee: participant.carte_mutuelle_verifiee,
    carte_identite_url: participant.carte_identite_url,
    carte_identite_verifiee: participant.carte_identite_verifiee,
  });

  // Drafts en cours d'édition
  const [draftPassport, setDraftPassport] = useState({
    numero: participant.passport_numero || '',
    verifie: participant.passport_verifie,
  });
  const [draftVisa, setDraftVisa] = useState({
    numero: participant.visa_numero || '',
    verifie: participant.visa_verifie,
  });
  const [draftEtatCivil, setDraftEtatCivil] = useState({
    date_naissance: participant.eleve.date_naissance?.split('T')[0] || '',
    nationalite: participant.eleve.nationalite || '',
  });

  const totalPaye = paiements.reduce((s, v) => s + Number(v.montant), 0);
  const attendu = config.montant_attendu_defaut;

  // ── Helpers ────────────────────────────────────────────────────────────

  const savePassport = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('voyage_participants')
      .update({
        passport_numero: draftPassport.numero || null,
        passport_verifie: draftPassport.verifie,
      })
      .eq('id', participant.id);
    setSaving(false);
    if (!error) {
      setPassport(draftPassport);
      onUpdate();
      setSectionEdition(null);
    } else {
      alert('Erreur lors de la sauvegarde');
      console.error(error);
    }
  };

  const saveVisa = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('voyage_participants')
      .update({
        visa_numero: draftVisa.numero || null,
        visa_verifie: draftVisa.verifie,
      })
      .eq('id', participant.id);
    setSaving(false);
    if (!error) {
      setVisa(draftVisa);
      onUpdate();
      setSectionEdition(null);
    } else {
      alert('Erreur lors de la sauvegarde');
      console.error(error);
    }
  };

  const saveEtatCivil = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('students')
      .update({
        date_naissance: draftEtatCivil.date_naissance || null,
        nationalite: draftEtatCivil.nationalite || null,
      })
      .eq('matricule', participant.eleve.matricule);
    setSaving(false);
    if (!error) {
      setEtatCivil({
        date_naissance: draftEtatCivil.date_naissance,
        nationalite: draftEtatCivil.nationalite,
      });
      onUpdate();
      setSectionEdition(null);
    } else {
      alert('Erreur lors de la sauvegarde');
      console.error(error);
    }
  };

  const uploadDocument = async (
    type: 'fiche_medicale' | 'carte_mutuelle' | 'carte_identite',
    file: File
  ) => {
    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${voyageId}/${participant.eleve_id}/${type}.${ext}`;

    setSaving(true);

    const { error: uploadError } = await supabase.storage
      .from('voyage-documents')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      alert('Erreur upload : ' + uploadError.message);
      console.error(uploadError);
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('voyage-documents')
      .getPublicUrl(path);

    const urlWithCacheBust = `${urlData.publicUrl}?t=${Date.now()}`;
    const urlField = `${type}_url`;
    const verifField = `${type}_verifiee`;

    const { error: dbError } = await supabase
      .from('voyage_participants')
      .update({ [urlField]: urlWithCacheBust, [verifField]: false })
      .eq('id', participant.id);

    if (dbError) {
      alert('Erreur lors de la sauvegarde');
      console.error(dbError);
      setSaving(false);
      return;
    }

    setDocuments(prev => ({
      ...prev,
      [urlField]: urlWithCacheBust,
      [verifField]: false,
    }));
    onUpdate();
    setSaving(false);
  };

  const marquerVerifie = async (
    type: 'fiche_medicale' | 'carte_mutuelle' | 'carte_identite'
  ) => {
    setSaving(true);
    const { error } = await supabase
      .from('voyage_participants')
      .update({ [`${type}_verifiee`]: true })
      .eq('id', participant.id);
    setSaving(false);
    if (!error) {
      setDocuments(prev => ({ ...prev, [`${type}_verifiee`]: true }));
      onUpdate();
    }
  };

  const supprimerDocument = async (
    type: 'fiche_medicale' | 'carte_mutuelle' | 'carte_identite'
  ) => {
    if (!confirm('Supprimer définitivement ce document ? L\'élève devra le recharger.')) return;
    setSaving(true);
    const { error } = await supabase
      .from('voyage_participants')
      .update({ [`${type}_url`]: null, [`${type}_verifiee`]: false })
      .eq('id', participant.id);
    setSaving(false);
    if (!error) {
      setDocuments(prev => ({ ...prev, [`${type}_url`]: null, [`${type}_verifiee`]: false }));
      onUpdate();
    }
  };

  const ajouterPaiement = async (montant: number, date: string) => {
    setSaving(true);
    const { data, error } = await supabase
      .from('voyage_paiements')
      .insert({
        voyage_participant_id: participant.id,
        montant,
        date_versement: date,
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setPaiements([{ id: data.id, montant: data.montant, date_versement: data.date_versement }, ...paiements]);
      setShowAddPaiement(false);
      onUpdate();
    } else {
      alert('Erreur lors de l\'ajout du paiement');
    }
  };

  const supprimerPaiement = async (id: string) => {
    if (!confirm('Supprimer ce versement ?')) return;
    setSaving(true);
    const { error } = await supabase.from('voyage_paiements').delete().eq('id', id);
    setSaving(false);
    if (!error) {
      setPaiements(paiements.filter(p => p.id !== id));
      onUpdate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">
                {participant.eleve.nom} {participant.eleve.prenom}
              </h2>
              <p className="text-sm text-gray-500">{participant.eleve.classe}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">

          {/* Participation */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={participant.participe}
                onChange={async (e) => {
                  await supabase
                    .from('voyage_participants')
                    .update({ participe: e.target.checked })
                    .eq('id', participant.id);
                  onUpdate();
                }}
                disabled={saving}
                className="w-5 h-5 rounded"
              />
              <span className="font-medium text-gray-800">Participe au voyage</span>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Si décoché, l'élève reste dans la liste mais avec l'indicateur ❌.
            </p>
          </div>

          {/* État civil */}
          <Section
            title="👤 État civil"
            id="etat-civil"
            sectionEdition={sectionEdition}
            onEdit={setSectionEdition}
            onCancel={() => setSectionEdition(null)}
            editContent={
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={draftEtatCivil.date_naissance}
                    onChange={(e) => setDraftEtatCivil({ ...draftEtatCivil, date_naissance: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationalité
                  </label>
                  <input
                    type="text"
                    value={draftEtatCivil.nationalite}
                    onChange={(e) => setDraftEtatCivil({ ...draftEtatCivil, nationalite: e.target.value })}
                    placeholder="Ex : Belge"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <button
                  onClick={saveEtatCivil}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            }
          >
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Date de naissance :</span>{' '}
                {etatCivil.date_naissance
                  ? new Date(etatCivil.date_naissance).toLocaleDateString('fr-BE')
                  : <span className="text-gray-400 italic">Non renseignée</span>}
              </p>
              <p>
                <span className="font-medium">Nationalité :</span>{' '}
                {etatCivil.nationalite || <span className="text-gray-400 italic">Non renseignée</span>}
              </p>
            </div>
          </Section>

          {/* Passeport */}
          {config.passport_requis && (
            <Section
              title="🛂 Passeport"
              id="passport"
              sectionEdition={sectionEdition}
              onEdit={setSectionEdition}
              onCancel={() => setSectionEdition(null)}
              editContent={
                <div className="space-y-2">
                  <input
                    type="text"
                    value={draftPassport.numero}
                    onChange={(e) => setDraftPassport({ ...draftPassport, numero: e.target.value })}
                    placeholder="Numéro de passeport"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draftPassport.verifie}
                      onChange={(e) => setDraftPassport({ ...draftPassport, verifie: e.target.checked })}
                    />
                    Vérifié
                  </label>
                  <button
                    onClick={savePassport}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </div>
              }
            >
              {passport.numero ? (
                <p className="text-sm">
                  Numéro : <span className="font-mono">{passport.numero}</span>{' '}
                  {passport.verifie ? (
                    <span className="text-green-600 font-medium">✅ Vérifié</span>
                  ) : (
                    <span className="text-orange-500 font-medium">⚠️ Non vérifié</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Non renseigné</p>
              )}
            </Section>
          )}

          {/* Visa */}
          {config.visa_requis && (
            <Section
              title="🛂 Visa"
              id="visa"
              sectionEdition={sectionEdition}
              onEdit={setSectionEdition}
              onCancel={() => setSectionEdition(null)}
              editContent={
                <div className="space-y-2">
                  <input
                    type="text"
                    value={draftVisa.numero}
                    onChange={(e) => setDraftVisa({ ...draftVisa, numero: e.target.value })}
                    placeholder="Numéro de visa"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draftVisa.verifie}
                      onChange={(e) => setDraftVisa({ ...draftVisa, verifie: e.target.checked })}
                    />
                    Vérifié
                  </label>
                  <button
                    onClick={saveVisa}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </div>
              }
            >
              {visa.numero ? (
                <p className="text-sm">
                  Numéro : <span className="font-mono">{visa.numero}</span>{' '}
                  {visa.verifie ? (
                    <span className="text-green-600 font-medium">✅ Vérifié</span>
                  ) : (
                    <span className="text-orange-500 font-medium">⚠️ Non vérifié</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">Non renseigné</p>
              )}
            </Section>
          )}

          {/* Régime alimentaire (lecture seule) */}
          <Section
            title="🍽️ Régime alimentaire"
            id="regime"
            sectionEdition={sectionEdition}
            onEdit={setSectionEdition}
            onCancel={() => setSectionEdition(null)}
            editContent={
              <p className="text-sm text-gray-500">
                Le régime alimentaire se modifie depuis l'onglet Participants.
              </p>
            }
          >
            {(() => {
              const r =
                typeof participant.eleve.regime_alimentaire === 'object' &&
                participant.eleve.regime_alimentaire !== null
                  ? participant.eleve.regime_alimentaire
                  : null;
              if (!r) return <p className="text-sm text-gray-400 italic">Non renseigné</p>;
              return (
                <div className="text-sm">
                  <p>
                    <span className="font-medium">Régime :</span> {r.regime}
                  </p>
                  {r.notes && (
                    <p className="text-gray-600 mt-1">
                      <span className="font-medium">Notes :</span> {r.notes}
                    </p>
                  )}
                </div>
              );
            })()}
          </Section>

          {/* Paiements */}
          <Section
            title="💰 Paiements"
            id="paiements"
            sectionEdition={sectionEdition}
            onEdit={setSectionEdition}
            onCancel={() => setSectionEdition(null)}
            editContent={
              <p className="text-sm text-gray-500">
                Utilisez le bouton "Ajouter un versement" ci-dessous.
              </p>
            }
          >
            <div className="space-y-3">
              {attendu != null ? (
                <p className="text-sm">
                  <span className="font-medium">Demandé :</span> {attendu}€{' '}
                  <span className="font-medium ml-3">Payé :</span>{' '}
                  {totalPaye < attendu && (
                    <span className="text-red-600 font-bold">
                      🔴 {totalPaye}€ (reste {attendu - totalPaye}€)
                    </span>
                  )}
                  {totalPaye === attendu && (
                    <span className="text-green-600 font-bold">🟢 {totalPaye}€</span>
                  )}
                  {totalPaye > attendu && (
                    <span className="text-green-600 font-bold">
                      🟢 {totalPaye}€
                      <span className="text-orange-500 font-normal ml-2">
                        (trop-perçu de {totalPaye - attendu}€)
                      </span>
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm">
                  <span className="font-medium">Payé :</span>{' '}
                  <span className="text-gray-700 font-bold">{totalPaye}€</span>
                </p>
              )}

              {paiements.length > 0 && (
                <ul className="text-sm space-y-1 mt-2">
                  {paiements.map((p) => (
                    <li
                      key={p.id}
                      className="flex justify-between items-center border rounded px-2 py-1"
                    >
                      <span>{new Date(p.date_versement).toLocaleDateString('fr-BE')}</span>
                      <span className="font-mono">{p.montant}€</span>
                      <button
                        onClick={() => supprimerPaiement(p.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => setShowAddPaiement(true)}
                className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                + Ajouter un versement
              </button>
            </div>
          </Section>

          {/* Documents */}
          {(['fiche_medicale', 'carte_mutuelle', 'carte_identite'] as const).map((type) => {
            const labels = {
              fiche_medicale: '🏥 Fiche médicale',
              carte_mutuelle: '💳 Carte européenne de mutuelle',
              carte_identite: '🪪 Carte d\'identité',
            };
            const url = documents[`${type}_url` as keyof typeof documents] as string | null;
            const verifiee = documents[`${type}_verifiee` as keyof typeof documents] as boolean;

            return (
              <div key={type} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-800">{labels[type]}</h3>
                  {url && (
                    <button
                      onClick={() => supprimerDocument(type)}
                      disabled={saving}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Supprimer le document"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {url ? (
                  <div className="space-y-2 text-sm">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline block"
                    >
                      📎 Voir le document
                    </a>
                    {verifiee ? (
                      <p className="text-green-600 font-medium">✅ Vérifié</p>
                    ) : (
                      <p className="text-orange-500 font-medium">⚠️ À vérifier</p>
                    )}

                    {!verifiee && (
                      <button
                        onClick={() => marquerVerifie(type)}
                        disabled={saving}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        ✅ Marquer comme vérifié
                      </button>
                    )}

                    <div className="pt-2">
                      <label className="text-xs text-gray-500 block mb-1">
                        Remplacer le document :
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadDocument(type, f);
                        }}
                        className="text-xs"
                        disabled={saving}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400 italic">Aucun document</p>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadDocument(type, f);
                      }}
                      className="text-sm"
                      disabled={saving}
                    />
                  </div>
                )}
              </div>
            );
          })}

        </div>

        <div className="p-6 border-t flex justify-end sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Modal ajout paiement */}
      {showAddPaiement && (
        <ModalAddPaiement
          onClose={() => setShowAddPaiement(false)}
          onConfirm={ajouterPaiement}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal ajout paiement
// ─────────────────────────────────────────────────────────────────────────────

function ModalAddPaiement({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (montant: number, date: string) => void;
}) {
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(montant);
    if (isNaN(m) || m <= 0) {
      alert('Montant invalide');
      return;
    }
    onConfirm(m, date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold">Ajouter un versement</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date du versement</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}