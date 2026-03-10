// lib/errors.ts
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Une erreur inattendue est survenue';
}

export function handleError(error: unknown, defaultMessage = 'Une erreur est survenue'): string {
  console.error('Erreur:', error);
  return getErrorMessage(error) || defaultMessage;
}