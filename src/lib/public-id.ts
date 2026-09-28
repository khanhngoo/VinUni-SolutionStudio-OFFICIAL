/**
 * Public IDs are PostgreSQL UUIDs. Validate untrusted route segments before
 * they reach a UUID comparison so a malformed URL is an ordinary missing
 * resource, never a database error.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPublicId(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}
