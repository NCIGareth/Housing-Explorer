export type GeoPoint = {
  lat: number;
  lon: number;
};

export type CurrentListing = {
  externalId: string;
  source: string;
  title: string;
  county: string;
  locality?: string;
  eircode?: string;
  askingPriceEur: number;
  beds?: number;
  baths?: number;
  propertyType?: string;
  listedAt: string;
  url: string;
  geo?: GeoPoint;
};
