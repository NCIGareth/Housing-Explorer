/**
 * Utilities for generating external deep-dive links for property research.
 */

export function getGoogleFloorplanSearchUrl(address: string): string {
  const query = encodeURIComponent(`${address} floorplans site:daft.ie OR site:myhome.ie`);
  return `https://www.google.com/search?q=${query}&tbm=isch`;
}

export function getDaftHistorySearchUrl(address: string): string {
  const query = encodeURIComponent(`${address} site:daft.ie`);
  return `https://www.google.com/search?q=${query}`;
}

export function getGoogleMapsUrl(address: string, eircode?: string): string {
  const queryParts = [address];
  if (eircode) queryParts.push(eircode);
  const query = encodeURIComponent(queryParts.join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
