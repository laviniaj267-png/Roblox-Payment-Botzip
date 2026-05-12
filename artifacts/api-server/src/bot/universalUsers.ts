/**
 * Universal users can use ALL bot commands in every server regardless of roles.
 */
export const UNIVERSAL_USER_IDS = new Set([
  "1456385131630563498",
  "1447169976862511146",
  "1498718274790228100",
]);

export function isUniversalUser(userId: string): boolean {
  return UNIVERSAL_USER_IDS.has(userId);
}
