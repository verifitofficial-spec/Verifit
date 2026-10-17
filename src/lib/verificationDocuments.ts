export type VerificationDocumentKind = 'license' | 'insurance';

export function isOwnedVerificationDocumentPath(
  userId: string,
  kind: VerificationDocumentKind,
  path: string
): boolean {
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) return false;

  const fileName = path.slice(prefix.length);
  return new RegExp(`^${kind}-\\d+\\.pdf$`).test(fileName);
}
