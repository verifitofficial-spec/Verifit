type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

/**
 * Erlaubt einen kontrollierten Deploy-vor-Migration-Fallback nur dann, wenn die
 * angefragte Relation laut PostgreSQL fehlt oder PostgREST sie nicht im Schema-Cache
 * findet. Der Relationsname muss in beiden Fällen exakt zur angefragten View passen;
 * Berechtigungs-, Netzwerk- und sonstige Fehler bleiben sichtbar.
 */
export function isMissingRelationError(error: unknown, relation: string): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as SupabaseErrorLike;
  const message = candidate.message?.toLowerCase() ?? '';
  const mentionsRelation = message.includes(relation.toLowerCase());

  return mentionsRelation && (
    candidate.code === '42P01' ||
    (candidate.code === 'PGRST205' && message.includes('schema cache'))
  );
}

/** Authentifizierungs- und RLS-Fehler dürfen nicht als fehlendes Schema ausgegeben werden. */
export function isAuthorizationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as SupabaseErrorLike;
  return candidate.code === '42501' || candidate.code === 'PGRST301' || candidate.code === 'PGRST302';
}

/** Datenbankseitig abgelehnte Werte/Typen werden getrennt von RLS- und Schemafehlern behandelt. */
export function isInvalidPayloadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as SupabaseErrorLike;
  return candidate.code === '23514' || candidate.code === '22P02' || candidate.code === 'PGRST102';
}
