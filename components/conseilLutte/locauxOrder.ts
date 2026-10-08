// components/conseilLutte/locauxOrder.ts
export const ORDRE_ETAGES: Record<string, number> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '6': 6, 'Annexe': 7,
};

export function trierLocaux(locaux: { id: string; etage: string }[]) {
  return [...locaux].sort((a, b) => {
    const ea = ORDRE_ETAGES[a.etage] ?? 99;
    const eb = ORDRE_ETAGES[b.etage] ?? 99;
    if (ea !== eb) return ea - eb;
    return a.id.localeCompare(b.id);
  });
}