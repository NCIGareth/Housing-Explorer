export const EIRCODE_KEY_RE = /^[A-Z]\d{1,2}$/;

/** True for Irish eircode routing keys like "D20", "A94", "K78". */
export function isEircodeKey(value: string) {
  return EIRCODE_KEY_RE.test(value.trim());
}
