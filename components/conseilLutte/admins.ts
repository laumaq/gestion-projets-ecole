// UUIDs des comptes autorisés à voir l'onglet Admin du Conseil de lutte.
export const CONSEIL_LUTTE_ADMINS: string[] = [
  '52793bea-994a-4b50-b768-75427df4747b',
];

export function estAdminConseilLutte(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return CONSEIL_LUTTE_ADMINS.includes(userId);
}