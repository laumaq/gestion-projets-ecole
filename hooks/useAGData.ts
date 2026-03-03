// hooks/useAGData.ts - Modifier updateConfig

// Mettre à jour la config (SANS effacer automatiquement)
const updateConfig = async (newConfig: Partial<AGConfig>) => {
  try {
    // On a ENLEVÉ la suppression automatique des communications
    const { error } = await supabase
      .from('ag_configs')
      .update({
        ...newConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', AG_ID);

    if (error) throw error;

    await loadData();
  } catch (err) {
    console.error('Erreur mise à jour config:', err);
    throw err;
  }
};
