// Dans HebergementConfigs.tsx, ajoutez ce composant
const ConfigurationVoyage = ({ voyageId, isResponsable }: { voyageId: string, isResponsable: boolean }) => {
  const [config, setConfig] = useState({ auto_affectation_eleves: false, visibilite_restreinte_eleves: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [voyageId]);

  const loadConfig = async () => {
    const { data } = await supabase
      .from('voyages')
      .select('auto_affectation_eleves, visibilite_restreinte_eleves')
      .eq('id', voyageId)
      .single();
    
    if (data) setConfig(data);
  };

  const updateConfig = async (key: string, value: boolean) => {
    setSaving(true);
    await supabase
      .from('voyages')
      .update({ [key]: value })
      .eq('id', voyageId);
    
    setConfig({ ...config, [key]: value });
    setSaving(false);
  };

  if (!isResponsable) return null;

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <h3 className="font-medium mb-3">Configuration des chambres pour les élèves</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.auto_affectation_eleves}
            onChange={(e) => updateConfig('auto_affectation_eleves', e.target.checked)}
            disabled={saving}
            className="rounded"
          />
          <span className="text-sm">Permettre aux élèves de s'inscrire eux-mêmes dans les chambres</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.visibilite_restreinte_eleves}
            onChange={(e) => updateConfig('visibilite_restreinte_eleves', e.target.checked)}
            disabled={saving}
            className="rounded"
          />
          <span className="text-sm">Restreindre la visibilité : les élèves ne voient que leur chambre</span>
        </label>
      </div>
    </div>
  );
};
