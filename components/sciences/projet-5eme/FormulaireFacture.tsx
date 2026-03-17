'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  userId: string;
}

interface FactureData {
  consommation_annuelle_kwh: string;
  bihoraire: boolean;
  consommation_jour_kwh: string;
  consommation_nuit_kwh: string;
  prix_kwh: string;
  nb_personnes: string;
}

const EMPTY: FactureData = {
  consommation_annuelle_kwh: '',
  bihoraire: false,
  consommation_jour_kwh: '',
  consommation_nuit_kwh: '',
  prix_kwh: '',
  nb_personnes: '',
};

export default function FormulaireFacture({ userId }: Props) {
  const [data, setData] = useState<FactureData>(EMPTY);
  const [existing, setExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: row } = await supabase
        .from('cite_factures')
        .select('*')
        .eq('student_id', userId)
        .single();

      if (row) {
        setExisting(true);
        setData({
          consommation_annuelle_kwh: row.consommation_annuelle_kwh?.toString() ?? '',
          bihoraire: row.bihoraire ?? false,
          consommation_jour_kwh: row.consommation_jour_kwh?.toString() ?? '',
          consommation_nuit_kwh: row.consommation_nuit_kwh?.toString() ?? '',
          prix_kwh: row.prix_kwh?.toString() ?? '',
          nb_personnes: row.nb_personnes?.toString() ?? '',
        });
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleChange = (field: keyof FactureData, value: string | boolean) => {
    setData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
    setError('');
  };

  const handleSubmit = async () => {
    if (!data.consommation_annuelle_kwh && !data.consommation_jour_kwh) {
      setError('Renseigne au moins la consommation annuelle ou les valeurs jour/nuit.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      student_id: parseInt(userId),
      consommation_annuelle_kwh: data.consommation_annuelle_kwh ? parseFloat(data.consommation_annuelle_kwh) : null,
      bihoraire: data.bihoraire,
      consommation_jour_kwh: data.bihoraire && data.consommation_jour_kwh ? parseFloat(data.consommation_jour_kwh) : null,
      consommation_nuit_kwh: data.bihoraire && data.consommation_nuit_kwh ? parseFloat(data.consommation_nuit_kwh) : null,
      prix_kwh: data.prix_kwh ? parseFloat(data.prix_kwh) : null,
      nb_personnes: data.nb_personnes ? parseFloat(data.nb_personnes) : null,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (existing) {
      ({ error: err } = await supabase.from('cite_factures').update(payload).eq('student_id', userId));
    } else {
      ({ error: err } = await supabase.from('cite_factures').insert(payload));
      if (!err) setExisting(true);
    }

    setSaving(false);
    if (err) setError('Erreur lors de la sauvegarde : ' + err.message);
    else setSaved(true);
  };

  if (loading) return <div className="text-gray-500 text-sm">Chargement...</div>;

  return (
    <div className="max-w-xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>📄 Mission facture</strong> — Demande à tes parents de regarder la dernière facture
          d'électricité et relève les informations ci-dessous. Si tu n'as pas toutes les infos,
          complète ce que tu peux !
        </p>
      </div>

      {existing && (
        <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-sm text-green-800">
          ✅ Tu as déjà rempli ce formulaire. Tu peux modifier tes données.
        </div>
      )}

      <div className="space-y-5">

        {/* Nombre de personnes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de personnes dans le foyer
            <span className="text-gray-400 font-normal ml-1">– en moyenne</span>
          </label>
          <input
            type="number"
            min="0.5"
            max="20"
            step="0.5"
            placeholder="ex : 4 ou 2.5"
            value={data.nb_personnes}
            onChange={e => handleChange('nb_personnes', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            Tu peux mettre un nombre décimal si des personnes sont présentes à mi-temps (ex : 2.5 pour 2 adultes + 1 enfant en garde partagée)
          </p>
        </div>

        {/* Consommation annuelle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Consommation annuelle totale (kWh)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="ex : 3500"
            value={data.consommation_annuelle_kwh}
            onChange={e => handleChange('consommation_annuelle_kwh', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            Valeur totale sur la facture annuelle ou mensuelle × 12
          </p>
        </div>

        {/* Compteur bihoraire */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => handleChange('bihoraire', !data.bihoraire)}
              className={`w-10 h-6 rounded-full transition-colors relative ${data.bihoraire ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${data.bihoraire ? 'left-5' : 'left-1'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Compteur bihoraire (jour/nuit)</span>
          </label>
          <p className="text-xs text-gray-400 mt-1 ml-13">
            Si la facture distingue une consommation de jour et de nuit
          </p>
        </div>

        {/* Jour / Nuit */}
        {data.bihoraire && (
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consommation jour (kWh)</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="ex : 2100"
                value={data.consommation_jour_kwh}
                onChange={e => handleChange('consommation_jour_kwh', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consommation nuit (kWh)</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="ex : 1400"
                value={data.consommation_nuit_kwh}
                onChange={e => handleChange('consommation_nuit_kwh', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        )}

        {/* Prix au kWh */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prix payé au kWh (€/kWh) <span className="text-gray-400 font-normal">– si visible sur la facture</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="ex : 0.28"
            value={data.prix_kwh}
            onChange={e => handleChange('prix_kwh', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md text-sm transition-colors disabled:opacity-60"
      >
        {saving ? 'Sauvegarde...' : existing ? '💾 Mettre à jour' : '✅ Enregistrer'}
      </button>

      {saved && (
        <p className="mt-3 text-sm text-green-600 font-medium">
          ✅ Données sauvegardées ! Merci pour ta contribution.
        </p>
      )}
    </div>
  );
}