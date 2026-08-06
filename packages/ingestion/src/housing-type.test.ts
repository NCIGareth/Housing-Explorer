import { describe, expect, it } from "vitest";
import { APARTMENT_ADDRESS_REGEX_SQL, isApartmentAddress } from "./lib/housing-type";

describe("isApartmentAddress", () => {
  it("matches apartment markers", () => {
    expect(isApartmentAddress("Ground Floor Apartment, North Circular Road, Dublin 7")).toBe(true);
    expect(isApartmentAddress("Apt 2, 21 Example Street, Cork")).toBe(true);
    expect(isApartmentAddress("Flat 3, Riverside Court, Galway")).toBe(true);
    expect(isApartmentAddress("The Mews, Apartment 5, Kilkenny")).toBe(true);
    expect(isApartmentAddress("Unit 21, Lakes Village, Tullamore")).toBe(true);
    expect(isApartmentAddress("Top Floor 14, Haroldville Avenue, Athlone")).toBe(true);
    expect(isApartmentAddress("Studio 4, Loft Quarter, Limerick")).toBe(true);
    expect(isApartmentAddress("Suite 25, Coldwater Lakes, Mullingar")).toBe(true);
    expect(isApartmentAddress("2 Penthouse, The Quays, Waterford")).toBe(true);
    expect(isApartmentAddress("Duplex 3, Canal Side, Carlow")).toBe(true);
  });

  it("does not match houses", () => {
    expect(isApartmentAddress("24 Prospect Road, Glasnevin, Dublin 9")).toBe(false);
    expect(isApartmentAddress("Hillside Cottage, The Glen, Donegal")).toBe(false);
    expect(isApartmentAddress("2 Maidenhead Park, Celbridge")).toBe(false);
  });

  it("does not false-positive on substrings", () => {
    // "community" contains "unit"; "flowers" contains "floor" at a distance
    expect(isApartmentAddress("Community Hall, Main Street, Sligo")).toBe(false);
    expect(isApartmentAddress("1 The Flowers, Kildare")).toBe(false);
    expect(isApartmentAddress("Aptly named road, Wexford")).toBe(false);
  });
});

describe("APARTMENT_ADDRESS_REGEX_SQL", () => {
  it("uses Postgres word boundary syntax", () => {
    expect(APARTMENT_ADDRESS_REGEX_SQL).toContain("\\y");
    expect(APARTMENT_ADDRESS_REGEX_SQL).not.toContain("\\b");
  });
});
