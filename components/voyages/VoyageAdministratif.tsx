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
        eleve:students!inner(matricule, nom, prenom, classe, regime_alimentaire)
      `)
      .eq('voyage_id', voyageId)
      .eq('participe', true);

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
    if (!p.fiche_medicale_url) return false;
    if (!p.carte_mutuelle_url) return false;
    if (!p.carte_identite_url) return false;
    if (p.montant_attendu != null && getTotalPaye(p) < Number(p.montant_attendu)) return false;
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

              const Dot = ({ ok, title }: { ok: boolean; title?: string }) => (
                <span
                  title={title}
                  className={`inline-block w-3 h-3 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
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
                  <td className="px-3 py-2 text-center">
                    {config.passport_requis ? (
                      <Dot ok={!!p.passport_numero && p.passport_verifie} title={
                        !p.passport_numero ? 'Non renseigné' : !p.passport_verifie ? 'Non vérifié' : 'OK'
                      } />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {config.visa_requis ? (
                      <Dot ok={!!p.visa_numero && p.visa_verifie} title={
                        !p.visa_numero ? 'Non renseigné' : !p.visa_verifie ? 'Non vérifié' : 'OK'
                      } />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Dot ok={!!p.fiche_medicale_url} title={p.fiche_medicale_verifiee ? 'Vérifiée' : p.fiche_medicale_url ? 'À vérifier' : 'Manquante'} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Dot ok={!!p.carte_mutuelle_url} title={p.carte_mutuelle_verifiee ? 'Vérifiée' : p.carte_mutuelle_url ? 'À vérifier' : 'Manquante'} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Dot ok={!!p.carte_identite_url} title={p.carte_identite_verifiee ? 'Vérifiée' : p.carte_identite_url ? 'À vérifier' : 'Manquante'} />
                  </td>
                  <td className="px-3 py-2 text-center text-xs font-mono">
                    {p.montant_attendu != null ? (
                      <span className={totalPaye >= Number(p.montant_attendu) ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                        {totalPaye}/{p.montant_attendu}€
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

  const [passportNumero, setPassportNumero] = useState(participant.passport_numero || '');
  const [passportVerifie, setPassportVerifie] = useState(participant.passport_verifie);
  const [visaNumero, setVisaNumero] = useState(participant.visa_numero || '');
  const [visaVerifie, setVisaVerifie] = useState(participant.visa_verifie);
  const [montantAttendu, setMontantAttendu] = useState<number | null>(participant.montant_attendu);

  const totalPaye = participant.paiements.reduce((s, v) => s + Number(v.montant), 0);

  const saveParticipantField = async (payload: Record<string, any>) => {
    setSaving(true);
    const { error } = await supabase
      .from('voyage_participants')
      .update(payload)
      .eq('id', participant.id);
    setSaving(false);
    if (!error) {
      onUpdate();
      setSectionEdition(null);
    } else {
      alert('Erreur lors de la sauvegarde');
      console.error(error);
    }
  };

  const uploadDocument = async (type: 'fiche_medicale' | 'carte_mutuelle' | 'carte_identite', file: File) => {
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

    await saveParticipantField({
      [urlField]: urlWithCacheBust,
      [verifField]: false,
    });

    setSaving(false);
  };

  const marquerVerifie = async (type: 'fiche_medicale' | 'carte_mutuelle' | 'carte_identite') => {
    await saveParticipantField({ [`${type}_verifiee`]: true });
  };

  const ajouterPaiement = async (montant: number, date: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('voyage_paiements')
      .insert({
        voyage_participant_id: participant.id,
        montant,
        date_versement: date,
      });
    setSaving(false);
    if (!error) {
      setShowAddPaiement(false);
      onUpdate();
    } else {
      alert('Erreur lors de l\'ajout du paiement');
    }
  };

  const supprimerPaiement = async (id: string) => {
    if (!confirm('Supprimer ce versement ?')) return;
    await supabase.from('voyage_paiements').delete().eq('id', id);
    onUpdate();
  };

  const Section = ({
    title,
    id,
    children,
    editContent,
  }: {
    title: string;
    id: string;
    children: React.ReactNode;
    editContent: React.ReactNode;
  }) => (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {sectionEdition === id ? (
          <button
            onClick={() => setSectionEdition(null)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Annuler
          </button>
        ) : (
          <button
            onClick={() => setSectionEdition(id)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            ✏️ Modifier
          </button>
        )}
      </div>
      {sectionEdition === id ? editContent : children}
    </div>
  );

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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">

          {/* Passeport */}
          {config.passport_requis && (
            <Section
              title="🛂 Passeport"
              id="passport"
              editContent={
                <div className="space-y-2">
                  <input
                    type="text"
                    value={passportNumero}
                    onChange={(e) => setPassportNumero(e.target.value)}
                    placeholder="Numéro de passeport"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={passportVerifie} onChange={(e) => setPassportVerifie(e.target.checked)} />
                    Vérifié
                  </label>
                  <button
                    onClick={() => saveParticipantField({ passport_numero: passportNumero, passport_verifie: passportVerifie })}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    Enregistrer
                  </button>
                </div>
              }
            >
              {participant.passport_numero ? (
                <p className="text-sm">
                  Numéro : <span className="font-mono">{participant.passport_numero}</span>{' '}
                  {participant.passport_verifie ? (
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
              editContent={
                <div className="space-y-2">
                  <input
                    type="text"
                    value={visaNumero}
                    onChange={(e) => setVisaNumero(e.target.value)}
                    placeholder="Numéro de visa"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={visaVerifie} onChange={(e) => setVisaVerifie(e.target.checked)} />
                    Vérifié
                  </label>
                  <button
                    onClick={() => saveParticipantField({ visa_numero: visaNumero, visa_verifie: visaVerifie })}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    Enregistrer
                  </button>
                </div>
              }
            >
              {participant.visa_numero ? (
                <p className="text-sm">
                  Numéro : <span className="font-mono">{participant.visa_numero}</span>{' '}
                  {participant.visa_verifie ? (
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

          {/* Régime alimentaire */}
          <Section
            title="🍽️ Régime alimentaire"
            id="regime"
            editContent={
              <p className="text-sm text-gray-500">
                Le régime alimentaire se modifie depuis l'onglet Participants.
              </p>
            }
          >
            {(() => {
              const r = typeof participant.eleve.regime_alimentaire === 'object' && participant.eleve.regime_alimentaire !== null
                ? participant.eleve.regime_alimentaire
                : null;
              if (!r) return <p className="text-sm text-gray-400 italic">Non renseigné</p>;
              return (
                <div className="text-sm">
                  <p><span className="font-medium">Régime :</span> {r.regime}</p>
                  {r.notes && <p className="text-gray-600 mt-1"><span className="font-medium">Notes :</span> {r.notes}</p>}
                </div>
              );
            })()}
          </Section>

          {/* Montant attendu individuel */}
          <Section
            title="🎯 Montant attendu (individuel)"
            id="montant"
            editContent={
              <div className="space-y-2">
                <input
                  type="number"
                  step="0.01"
                  value={montantAttendu ?? ''}
                  onChange={(e) => setMontantAttendu(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <button
                  onClick={() => saveParticipantField({ montant_attendu: montantAttendu })}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  Enregistrer
                </button>
              </div>
            }
          >
            <p className="text-sm">
              {participant.montant_attendu != null ? `${participant.montant_attendu}€` : <span className="text-gray-400 italic">Non défini</span>}
            </p>
          </Section>

          {/* Paiements */}
          <Section
            title="💰 Paiements"
            id="paiements"
            editContent={
              <p className="text-sm text-gray-500">
                Utilisez le bouton "Ajouter un versement" ci-dessous.
              </p>
            }
          >
            <div className="space-y-2">
              {participant.montant_attendu != null && (
                <p className="text-sm">
                  <span className="font-medium">Attendu :</span> {participant.montant_attendu}€{' '}
                  <span className="font-medium ml-3">Payé :</span>{' '}
                  <span className={totalPaye >= Number(participant.montant_attendu) ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                    {totalPaye}€
                  </span>
                </p>
              )}
              {participant.paiements.length > 0 && (
                <ul className="text-sm space-y-1 mt-2">
                  {participant.paiements.map((p) => (
                    <li key={p.id} className="flex justify-between items-center border rounded px-2 py-1">
                      <span>{new Date(p.date_versement).toLocaleDateString('fr-BE')}</span>
                      <span className="font-mono">{p.montant}€</span>
                      <button onClick={() => supprimerPaiement(p.id)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => setShowAddPaiement(true)}
                className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-xs"
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
            const url = participant[`${type}_url` as keyof Participant] as string | null;
            const verifiee = participant[`${type}_verifiee` as keyof Participant] as boolean;

            return (
              <Section
                key={type}
                title={labels[type]}
                id={type}
                editContent={
                  <div className="space-y-2">
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
                    {url && !verifiee && (
                      <button
                        onClick={() => marquerVerifie(type)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                      >
                        ✅ Marquer comme vérifié
                      </button>
                    )}
                  </div>
                }
              >
                {url ? (
                  <div className="text-sm space-y-1">
                    <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      📎 Voir le document
                    </a>
                    {verifiee ? (
                      <p className="text-green-600 font-medium">✅ Vérifié</p>
                    ) : (
                      <p className="text-orange-500 font-medium">⚠️ À vérifier</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Aucun document</p>
                )}
              </Section>
            );
          })}

        </div>

        <div className="p-6 border-t flex justify-end sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
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