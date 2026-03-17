'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  userId: string;
}

interface Appareil {
  id: string;
  source: 'wattmetre' | 'recherche';
  nom_appareil: string;
  categorie: string;
  puissance_w: number | null;
  energie_kwh: number | null;
  duree_mesure_min: number | null;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: 'cuisson', label: '🍳 Cuisson', exemples: 'bouilloire, grille-pain, four, micro-ondes' },
  { value: 'froid', label: '🧊 Froid alimentaire', exemples: 'réfrigérateur, congélateur' },
  { value: 'lavage', label: '🫧 Lavage', exemples: 'lave-linge, sèche-linge, lave-vaisselle' },
  { value: 'chauffage', label: '🔥 Chauffage & clim', exemples: 'radiateur, convecteur, climatiseur' },
  { value: 'eclairage', label: '💡 Éclairage', exemples: 'ampoule LED, halogène, néon' },
  { value: 'info_av', label: '🖥️ Informatique & audiovisuel', exemples: 'PC, TV, console, tablette' },
  { value: 'charge', label: '🔋 Charge', exemples: 'chargeur téléphone, chargeur vélo/voiture élec.' },
  { value: 'hygiene', label: '🚿 Hygiène & confort', exemples: 'fer à repasser, sèche-cheveux, aspirateur' },
  { value: 'autre', label: '📦 Autre', exemples: '' },
];

const EMPTY_FORM = {
  source: 'wattmetre' as 'wattmetre' | 'recherche',
  nom_appareil: '',
  categorie: '',
  puissance_w: '',
  energie_kwh: '',
  duree_mesure_min: '',
  notes: '',
};

export default function FormulaireAppareil({ userId }: Props) {
  const [appareils, setAppareils] = useState<Appareil[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('cite_appareils')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });
    setAppareils(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const handleSave = async () => {
    if (!form.nom_appareil.trim()) { setError('Nomme l\'appareil.'); return; }
    if (!form.categorie) { setError('Choisis une catégorie.'); return; }
    if (!form.puissance_w && !form.energie_kwh) {
      setError('Renseigne au moins la puissance (W) ou l\'énergie (kWh).');
      return;
    }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('cite_appareils').insert({
      student_id: parseInt(userId),
      source: form.source,
      nom_appareil: form.nom_appareil.trim(),
      categorie: form.categorie,
      puissance_w: form.puissance_w ? parseFloat(form.puissance_w) : null,
      energie_kwh: form.energie_kwh ? parseFloat(form.energie_kwh) : null,
      duree_mesure_min: form.duree_mesure_min ? parseFloat(form.duree_mesure_min) : null,
      notes: form.notes.trim() || null,
    });

    setSaving(false);
    if (err) { setError('Erreur : ' + err.message); return; }
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet appareil ?')) return;
    await supabase.from('cite_appareils').delete().eq('id', id).eq('student_id', userId);
    load();
  };

  const getCatLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label ?? val;

  const grouped = appareils.reduce((acc, a) => {
    if (!acc[a.categorie]) acc[a.categorie] = [];
    acc[a.categorie].push(a);
    return acc;
  }, {} as Record<string, Appareil[]>);

  return (
    <div className="max-w-2xl">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-orange-800">
          <strong>🔌 Mission appareils</strong> — Mesure ou recherche la puissance de 2 à 3 appareils
          à la maison. Tu peux utiliser un wattmètre (disponible sur demande) ou chercher sur internet.
          Ajoute chaque appareil séparément.
        </p>
      </div>

      {/* Liste existante */}
      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : appareils.length === 0 ? (
        <p className="text-gray-400 text-sm italic mb-4">Aucun appareil encore renseigné.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">{getCatLabel(cat)}</h3>
              <div className="space-y-2">
                {items.map(a => (
                  <div key={a.id} className="flex items-start justify-between bg-white border border-gray-200 rounded-lg p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-800">{a.nom_appareil}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          a.source === 'wattmetre'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {a.source === 'wattmetre' ? '🔌 wattmètre' : '🔍 recherche'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-3">
                        {a.puissance_w != null && <span><strong>{a.puissance_w} W</strong></span>}
                        {a.energie_kwh != null && (
                          <span>
                            <strong>{a.energie_kwh} kWh</strong>
                            {a.duree_mesure_min ? ` / ${a.duree_mesure_min} min` : ''}
                          </span>
                        )}
                        {a.notes && <span className="italic text-gray-400">{a.notes}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-gray-300 hover:text-red-400 text-lg leading-none flex-shrink-0"
                      title="Supprimer"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton ajouter */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          + Ajouter un appareil
        </button>
      )}

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-2">
          <h3 className="font-semibold text-gray-800 mb-4">Nouvel appareil</h3>

          {/* Source */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Source de la mesure</label>
            <div className="flex gap-3">
              {(['wattmetre', 'recherche'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setForm(f => ({ ...f, source: s }))}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                    form.source === s
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
                  }`}
                >
                  {s === 'wattmetre' ? '🔌 Wattmètre' : '🔍 Recherche internet'}
                </button>
              ))}
            </div>
          </div>

          {/* Catégorie */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              value={form.categorie}
              onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="">-- Choisis une catégorie --</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}{c.exemples ? ` (${c.exemples})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Nom */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'appareil</label>
            <input
              type="text"
              placeholder="ex : bouilloire Philips, réfrigérateur Samsung..."
              value={form.nom_appareil}
              onChange={e => setForm(f => ({ ...f, nom_appareil: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Puissance + Énergie */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puissance (W)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="ex : 2200"
                value={form.puissance_w}
                onChange={e => setForm(f => ({ ...f, puissance_w: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Énergie consommée (kWh)</label>
              <input
                type="number"
                min="0"
                step="0.001"
                placeholder="ex : 0.085"
                value={form.energie_kwh}
                onChange={e => setForm(f => ({ ...f, energie_kwh: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Durée — visible pour les deux sources si énergie renseignée */}
          {form.energie_kwh && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée correspondante (minutes)
                <span className="text-gray-400 font-normal ml-1">– optionnel</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder={form.source === 'wattmetre' ? 'ex : 5' : 'ex : 3 (pour faire bouillir)'}
                value={form.duree_mesure_min}
                onChange={e => setForm(f => ({ ...f, duree_mesure_min: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                {form.source === 'wattmetre'
                  ? 'Durée pendant laquelle tu as mesuré avec le wattmètre'
                  : 'Durée d\'utilisation correspondant à l\'énergie trouvée (ex : temps de chauffe)'}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">– optionnel (classe énergétique, modèle, remarques...)</span>
            </label>
            <input
              type="text"
              placeholder="ex : classe A+++, mesure au démarrage vs régime..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : '✅ Ajouter'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(''); }}
              className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}