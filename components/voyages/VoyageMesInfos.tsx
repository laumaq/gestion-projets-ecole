// components/voyages/VoyageMesInfos.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  voyageId: string;
  userType: 'employee' | 'student' | null;
  userId: string;
}

interface VoyageConfig {
  passport_requis: boolean;
  visa_requis: boolean;
  eleve_peut_modifier_telephone: boolean;
  eleve_peut_modifier_regime: boolean;
}

interface MesInfos {
  // Élève
    eleve_id?: number;
    telephone_eleve?: string;
    telephone_parent?: string;
    regime_alimentaire?: any;
    date_naissance?: string | null;
    nationalite?: string | null;
  // Participant (ligne voyage_participants)
  participant_id?: string;
  passport_numero?: string | null;
  passport_verifie?: boolean;
  visa_numero?: string | null;
  visa_verifie?: boolean;
  fiche_medicale_url?: string | null;
  fiche_medicale_verifiee?: boolean;
  carte_mutuelle_url?: string | null;
  carte_mutuelle_verifiee?: boolean;
  carte_identite_url?: string | null;
  carte_identite_verifiee?: boolean;
  montant_attendu?: number | null;
  // Professeur
  prof_id?: string;
  prof_date_naissance?: string | null;
  prof_nationalite?: string | null;
  prof_regime_alimentaire?: any;
  prof_telephone?: string | null;
  prof_eleve_voir_telephone?: boolean;
}

interface Paiement {
  id: string;
  montant: number;
  date_versement: string;
}

export default function VoyageMesInfos({ voyageId, userType, userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<VoyageConfig>({
    passport_requis: false,
    visa_requis: false,
    eleve_peut_modifier_telephone: false,
    eleve_peut_modifier_regime: false,
  });
  const [infos, setInfos] = useState<MesInfos>({});
  const [paiements, setPaiements] = useState<Paiement[]>([]);

  // Drafts
  const [draftRegime, setDraftRegime] = useState<{ regime: string; notes: string }>({ regime: 'Omnivore', notes: '' });
  const [draftTelephone, setDraftTelephone] = useState('');
  const [draftTelephoneParent, setDraftTelephoneParent] = useState('');
  const [draftPassport, setDraftPassport] = useState('');
  const [draftVisa, setDraftVisa] = useState('');
  const [draftProfInfos, setDraftProfInfos] = useState({
    telephone: '',
    date_naissance: '',
    nationalite: '',
    eleve_voir_telephone: false,
    regime: 'Omnivore',
    regime_notes: '',
  });
  const [draftDateNaissance, setDraftDateNaissance] = useState('');
  const [draftNationalite, setDraftNationalite] = useState('');

  useEffect(() => {
    loadAll();
  }, [voyageId, userType, userId]);

  const loadAll = async () => {
    setLoading(true);

    // Config du voyage
    const { data: voyageData } = await supabase
      .from('voyages')
      .select('passport_requis, visa_requis, eleve_peut_modifier_telephone, eleve_peut_modifier_regime')
      .eq('id', voyageId)
      .single();

    if (voyageData) setConfig(voyageData);

    if (userType === 'student') {
      const eleveId = parseInt(userId);

      // Infos élève
      const { data: eleveData } = await supabase
        .from('students')
        .select('matricule, telephone_eleve, telephone_parent, regime_alimentaire, date_naissance, nationalite')
        .eq('matricule', eleveId)
        .single();

      // Ligne participant du voyage
      const { data: partData } = await supabase
        .from('voyage_participants')
        .select(`
          id, passport_numero, passport_verifie,
          visa_numero, visa_verifie,
          fiche_medicale_url, fiche_medicale_verifiee,
          carte_mutuelle_url, carte_mutuelle_verifiee,
          carte_identite_url, carte_identite_verifiee,
          montant_attendu
        `)
        .eq('voyage_id', voyageId)
        .eq('eleve_id', eleveId)
        .maybeSingle();

      const merged: MesInfos = {
        eleve_id: eleveId,
        telephone_eleve: eleveData?.telephone_eleve || '',
        telephone_parent: eleveData?.telephone_parent || '',
        regime_alimentaire: eleveData?.regime_alimentaire || { regime: 'Omnivore', notes: '' },
        date_naissance: eleveData?.date_naissance,
        nationalite: eleveData?.nationalite,
        participant_id: partData?.id,
        passport_numero: partData?.passport_numero,
        passport_verifie: partData?.passport_verifie,
        visa_numero: partData?.visa_numero,
        visa_verifie: partData?.visa_verifie,
        fiche_medicale_url: partData?.fiche_medicale_url,
        fiche_medicale_verifiee: partData?.fiche_medicale_verifiee,
        carte_mutuelle_url: partData?.carte_mutuelle_url,
        carte_mutuelle_verifiee: partData?.carte_mutuelle_verifiee,
        carte_identite_url: partData?.carte_identite_url,
        carte_identite_verifiee: partData?.carte_identite_verifiee,
        montant_attendu: partData?.montant_attendu,
      };

      setInfos(merged);

      const r = merged.regime_alimentaire;
      if (r && typeof r === 'object') {
        setDraftRegime({ regime: r.regime || 'Omnivore', notes: r.notes || '' });
      }

      setDraftTelephone(merged.telephone_eleve || '');
      setDraftTelephoneParent(merged.telephone_parent || '');
      setDraftDateNaissance(merged.date_naissance?.split('T')[0] || '');
      setDraftNationalite(merged.nationalite || '');
      setDraftPassport(merged.passport_numero || '');
      setDraftVisa(merged.visa_numero || '');

      // Paiements
      if (partData?.id) {
        const { data: paiementsData } = await supabase
          .from('voyage_paiements')
          .select('id, montant, date_versement')
          .eq('voyage_participant_id', partData.id)
          .order('date_versement', { ascending: false });

        setPaiements(paiementsData || []);
      }
    } else if (userType === 'employee') {
      // Infos employé
      const { data: empData } = await supabase
        .from('employees')
        .select('telephone, date_naissance, nationalite, regime_alimentaire, eleve_voir_telephone')
        .eq('id', userId)
        .maybeSingle();

      if (empData) {
        setInfos({
          prof_id: userId,
          prof_telephone: empData.telephone,
          prof_date_naissance: empData.date_naissance,
          prof_nationalite: empData.nationalite,
          prof_regime_alimentaire: empData.regime_alimentaire,
          prof_eleve_voir_telephone: empData.eleve_voir_telephone,
        });

        const r = empData.regime_alimentaire;
        setDraftProfInfos({
          telephone: empData.telephone || '',
          date_naissance: empData.date_naissance?.split('T')[0] || '',
          nationalite: empData.nationalite || '',
          eleve_voir_telephone: empData.eleve_voir_telephone || false,
          regime: r?.regime || 'Omnivore',
          regime_notes: r?.notes || '',
        });
      }
    }

    setLoading(false);
  };

  const saveRegime = async () => {
    setSaving(true);
    await supabase
      .from('students')
      .update({ regime_alimentaire: draftRegime })
      .eq('matricule', infos.eleve_id!);
    setInfos({ ...infos, regime_alimentaire: draftRegime });
    setSaving(false);
    alert('Régime enregistré');
  };

  const saveTelephone = async () => {
    setSaving(true);
    await supabase
      .from('students')
      .update({
        telephone_eleve: draftTelephone || null,
        telephone_parent: draftTelephoneParent || null,
      })
      .eq('matricule', infos.eleve_id!);
    setInfos({
      ...infos,
      telephone_eleve: draftTelephone,
      telephone_parent: draftTelephoneParent,
    });
    setSaving(false);
    alert('Téléphones enregistrés');
  };

  const saveEtatCivil = async () => {
    setSaving(true);
    await supabase
      .from('students')
      .update({
        date_naissance: draftDateNaissance || null,
        nationalite: draftNationalite || null,
      })
      .eq('matricule', infos.eleve_id!);
    setInfos({
      ...infos,
      date_naissance: draftDateNaissance,
      nationalite: draftNationalite,
    });
    setSaving(false);
    alert('Informations enregistrées');
  };

  const savePassport = async () => {
    if (!infos.participant_id) return;
    setSaving(true);
    await supabase
      .from('voyage_participants')
      .update({ passport_numero: draftPassport || null, passport_verifie: false })
      .eq('id', infos.participant_id);
    setInfos({ ...infos, passport_numero: draftPassport, passport_verifie: false });
    setSaving(false);
    alert('Passeport enregistré (à vérifier par un responsable)');
  };

  const saveVisa = async () => {
    if (!infos.participant_id) return;
    setSaving(true);
    await supabase
      .from('voyage_participants')
      .update({ visa_numero: draftVisa || null, visa_verifie: false })
      .eq('id', infos.participant_id);
    setInfos({ ...infos, visa_numero: draftVisa, visa_verifie: false });
    setSaving(false);
    alert('Visa enregistré (à vérifier par un responsable)');
  };

  const uploadDocument = async (type: 'fiche_medicale' | 'carte_mutuelle' | 'carte_identite', file: File) => {
    if (!infos.participant_id || !infos.eleve_id) return;

    const ext = file.name.split('.').pop() || 'pdf';
    const path = `${voyageId}/${infos.eleve_id}/${type}.${ext}`;

    setSaving(true);

    const { error: uploadError } = await supabase.storage
      .from('voyage-documents')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      alert('Erreur upload : ' + uploadError.message);
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('voyage-documents')
      .getPublicUrl(path);

    const urlWithCacheBust = `${urlData.publicUrl}?t=${Date.now()}`;
    const urlField = `${type}_url`;
    const verifField = `${type}_verifiee`;

    await supabase
      .from('voyage_participants')
      .update({ [urlField]: urlWithCacheBust, [verifField]: false })
      .eq('id', infos.participant_id);

    setInfos({ ...infos, [urlField]: urlWithCacheBust, [verifField]: false });
    setSaving(false);
    alert('Document uploadé (à vérifier par un responsable)');
  };

  const saveProfInfos = async () => {
    setSaving(true);
    await supabase
      .from('employees')
      .update({
        telephone: draftProfInfos.telephone || null,
        date_naissance: draftProfInfos.date_naissance || null,
        nationalite: draftProfInfos.nationalite || null,
        eleve_voir_telephone: draftProfInfos.eleve_voir_telephone,
        regime_alimentaire: { regime: draftProfInfos.regime, notes: draftProfInfos.regime_notes },
      })
      .eq('id', infos.prof_id!);
    setSaving(false);
    alert('Informations enregistrées');
    loadAll();
  };

  const totalPaye = paiements.reduce((s, p) => s + Number(p.montant), 0);

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900">Mes informations</h2>

      {/* ========== VUE ÉLÈVE ========== */}
      {userType === 'student' && (
        <>
          {/* Régime */}
          <Section title="🍽️ Régime alimentaire" locked={!config.eleve_peut_modifier_regime}>
            <div className="space-y-3">
              <select
                value={draftRegime.regime}
                onChange={(e) => setDraftRegime({ ...draftRegime, regime: e.target.value })}
                disabled={!config.eleve_peut_modifier_regime}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              >
                <option value="Omnivore">Omnivore</option>
                <option value="Végétarien">Végétarien</option>
                <option value="Halal">Halal</option>
              </select>
              <textarea
                value={draftRegime.notes}
                onChange={(e) => setDraftRegime({ ...draftRegime, notes: e.target.value })}
                disabled={!config.eleve_peut_modifier_regime}
                placeholder="Allergies, intolérances, précisions..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              />
              {config.eleve_peut_modifier_regime && (
                <button onClick={saveRegime} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  Enregistrer
                </button>
              )}
            </div>
          </Section>

          {/* État civil */}
          <Section title="👤 État civil">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={draftDateNaissance}
                  onChange={(e) => setDraftDateNaissance(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationalité
                </label>
                <input
                  type="text"
                  value={draftNationalite}
                  onChange={(e) => setDraftNationalite(e.target.value)}
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
          </Section>

          {/* Téléphones */}
          <Section title="📞 Téléphones" locked={!config.eleve_peut_modifier_telephone}>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mon téléphone</label>
                <input
                  type="tel"
                  value={draftTelephone}
                  onChange={(e) => setDraftTelephone(e.target.value)}
                  disabled={!config.eleve_peut_modifier_telephone}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone parent</label>
                <input
                  type="tel"
                  value={draftTelephoneParent}
                  onChange={(e) => setDraftTelephoneParent(e.target.value)}
                  disabled={!config.eleve_peut_modifier_telephone}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                />
              </div>
              {config.eleve_peut_modifier_telephone && (
                <button onClick={saveTelephone} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  Enregistrer
                </button>
              )}
            </div>
          </Section>

          {/* Passeport */}
          {config.passport_requis && (
            <Section title="🛂 Passeport">
              <div className="space-y-3">
                <input
                  type="text"
                  value={draftPassport}
                  onChange={(e) => setDraftPassport(e.target.value)}
                  placeholder="Numéro de passeport"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {infos.passport_verifie ? (
                  <p className="text-sm text-green-600">✅ Vérifié par un responsable</p>
                ) : infos.passport_numero ? (
                  <p className="text-sm text-orange-500">⚠️ En attente de vérification</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Non renseigné</p>
                )}
                <button onClick={savePassport} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  Enregistrer
                </button>
              </div>
            </Section>
          )}

          {/* Visa */}
          {config.visa_requis && (
            <Section title="🛂 Visa">
              <div className="space-y-3">
                <input
                  type="text"
                  value={draftVisa}
                  onChange={(e) => setDraftVisa(e.target.value)}
                  placeholder="Numéro de visa"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {infos.visa_verifie ? (
                  <p className="text-sm text-green-600">✅ Vérifié par un responsable</p>
                ) : infos.visa_numero ? (
                  <p className="text-sm text-orange-500">⚠️ En attente de vérification</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Non renseigné</p>
                )}
                <button onClick={saveVisa} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  Enregistrer
                </button>
              </div>
            </Section>
          )}

          {/* Documents */}
          {(['fiche_medicale', 'carte_mutuelle', 'carte_identite'] as const).map((type) => {
            const labels = {
              fiche_medicale: '🏥 Fiche médicale',
              carte_mutuelle: '💳 Carte européenne de mutuelle',
              carte_identite: '🪪 Carte d\'identité',
            };
            const url = infos[`${type}_url` as keyof MesInfos] as string | null;
            const verifiee = infos[`${type}_verifiee` as keyof MesInfos] as boolean;

            return (
              <Section key={type} title={labels[type]}>
                <div className="space-y-3">
                  {url ? (
                    <div className="text-sm space-y-1">
                      <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        📎 Voir mon document actuel
                      </a>
                      {verifiee ? (
                        <p className="text-green-600">✅ Vérifié par un responsable</p>
                      ) : (
                        <p className="text-orange-500">⚠️ En attente de vérification</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Aucun document</p>
                  )}
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
              </Section>
            );
          })}

          {/* Paiements */}
          <Section title="💰 Paiements">
            <div className="space-y-2 text-sm">
              {infos.montant_attendu != null && (
                <p>
                  <span className="font-medium">Montant attendu :</span> {infos.montant_attendu}€{' '}
                  <span className="font-medium ml-3">Payé :</span>{' '}
                  <span className={totalPaye >= Number(infos.montant_attendu) ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                    {totalPaye}€
                  </span>
                </p>
              )}
              {paiements.length > 0 ? (
                <ul className="space-y-1 mt-2">
                  {paiements.map((p) => (
                    <li key={p.id} className="flex justify-between border rounded px-2 py-1">
                      <span>{new Date(p.date_versement).toLocaleDateString('fr-BE')}</span>
                      <span className="font-mono">{p.montant}€</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 italic">Aucun versement enregistré</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Les paiements sont encaissés et enregistrés par les responsables du voyage.
              </p>
            </div>
          </Section>
        </>
      )}

      {/* ========== VUE EMPLOYÉ ========== */}
      {userType === 'employee' && (
        <>

          <Section title="📞 Téléphone">
            <input
              type="tel"
              value={draftProfInfos.telephone}
              onChange={(e) => setDraftProfInfos({ ...draftProfInfos, telephone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="+32 123 45 67 89"
            />
            <label className="flex items-center gap-2 mt-3 text-sm">
              <input
                type="checkbox"
                checked={draftProfInfos.eleve_voir_telephone}
                onChange={(e) => setDraftProfInfos({ ...draftProfInfos, eleve_voir_telephone: e.target.checked })}
              />
              <span>Les élèves peuvent voir mon numéro de téléphone</span>
            </label>
          </Section>

          <Section title="🎂 Date de naissance">
            <input
              type="date"
              value={draftProfInfos.date_naissance}
              onChange={(e) => setDraftProfInfos({ ...draftProfInfos, date_naissance: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </Section>

          <Section title="🌍 Nationalité">
            <input
              type="text"
              value={draftProfInfos.nationalite}
              onChange={(e) => setDraftProfInfos({ ...draftProfInfos, nationalite: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ex : Belge"
            />
          </Section>

          <Section title="🍽️ Régime alimentaire">
            <div className="space-y-3">
              <select
                value={draftProfInfos.regime}
                onChange={(e) => setDraftProfInfos({ ...draftProfInfos, regime: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Omnivore">Omnivore</option>
                <option value="Végétarien">Végétarien</option>
                <option value="Halal">Halal</option>
              </select>
              <textarea
                value={draftProfInfos.regime_notes}
                onChange={(e) => setDraftProfInfos({ ...draftProfInfos, regime_notes: e.target.value })}
                placeholder="Allergies, intolérances, précisions..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </Section>

          <div>
            <button onClick={saveProfInfos} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Enregistrer mes informations
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section réutilisable
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  locked = false,
  children,
}: {
  title: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {locked && (
          <span className="text-xs text-gray-400 italic">
            🔒 Modifications verrouillées par les responsables
          </span>
        )}
      </div>
      {children}
    </div>
  );
}