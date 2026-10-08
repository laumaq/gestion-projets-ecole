// /components/conseilLutte/CreerConfig.tsx

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CreerConfig({ onCreated }: { onCreated: () => void }) {
  const [nom, setNom] = useState('Conseil de lutte');
  const [date, setDate] = useState(todayLocal());
  const [intro, setIntro] = useState('');
  const [saving, setSaving] = useState(false);

  const creer = async () => {
    setSaving(true);
    const { error } = await supabase.from('conseil_lutte_configs').insert({
      nom, date_evenement: date, intro,
      redirection_active: false,
      ouverte_inscriptions: false,
    });
    setSaving(false);
    if (error) { alert('Erreur : ' + error.message); return; }
    onCreated();
  };

  return (
    <div className="bg-white border rounded-lg p-6 max-w-xl">
      <h2 className="text-lg font-semibold mb-4">Nouvelle config</h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Nom</label>
          <input value={nom} onChange={e => setNom(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="text-sm text-gray-600 block mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="text-sm text-gray-600 block mb-1">Message d'accueil (optionnel)</label>
          <textarea value={intro} onChange={e => setIntro(e.target.value)} rows={3}
            className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <button onClick={creer} disabled={saving}
          className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Création…' : 'Créer'}
        </button>
      </div>
    </div>
  );
}