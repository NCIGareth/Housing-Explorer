/**
 * Apartment / flat detection from address tokens.
 *
 * PPR has no apt-vs-house field, so we scan the address for apartment markers.
 * Every token below was verified on the live DB (2026-08-06): addresses
 * containing `unit`, `floor`, or `suite` are apartment-style dwellings, and no
 * street name contains them. 42,244 of 701,890 rows match.
 *
 * NOTE: word-boundary syntax differs between engines —
 *  - JS uses `\b`
 *  - Postgres ARE uses `\y` (`\b` is the backspace character there)
 * Both are generated from the same token list to stay in lockstep.
 */

export const APARTMENT_ADDRESS_TOKENS =
  "apartments?|apts?|flats?|floor|unit|suite|studios?|penthouses?|duplex|maisonettes?";

/** Postgres regex (ARE `\y` word boundary). Used by the isApartment backfill. */
export const APARTMENT_ADDRESS_REGEX_SQL = String.raw`\y(${APARTMENT_ADDRESS_TOKENS})\y`;

/** JS regex (`\b` word boundary). Used at import time. */
const APARTMENT_ADDRESS_RE = new RegExp(String.raw`\b(${APARTMENT_ADDRESS_TOKENS})\b`, "i");

export function isApartmentAddress(address: string): boolean {
  return APARTMENT_ADDRESS_RE.test(address);
}
