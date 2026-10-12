// UUIDs des comptes autorisés à voir l'onglet Admin du Conseil de lutte.
export const CONSEIL_LUTTE_ADMINS: string[] = [
  '52793bea-994a-4b50-b768-75427df4747b',
  'a06b22ec-11f6-49a7-ab8a-13607ff2ac87',
  'b6e22622-1a72-4969-8f2a-05289ec82151',
];

export function estAdminConseilLutte(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return CONSEIL_LUTTE_ADMINS.includes(userId);
}