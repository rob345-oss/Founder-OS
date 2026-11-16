/** Keep only digits for phone duplicate checks and storage comparison. */
export function normalizePhoneDigits(phone: string | null | undefined): string | null {
  if (phone == null) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

/** True when two phone strings likely refer to the same number (last 10 digits). */
export function phonesLikelyMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const tail = (d: string) => (d.length > 10 ? d.slice(-10) : d);
  return tail(da) === tail(db) && tail(da).length >= 7;
}