import { describe, expect, it } from "vitest";
import { routingKeyCoordinates } from "./lib/eircode-heuristics";
import { normalizeEircode } from "./modules/ppr-import";

function geocodeEircode(eircode: string | undefined): { latitude: number | null; longitude: number | null } {
  const normalized = eircode ? normalizeEircode(eircode) : undefined;
  if (!normalized) {
    return { latitude: null, longitude: null };
  }

  const routingKey = normalized.slice(0, 3);
  const coords = routingKeyCoordinates[routingKey];
  if (coords) {
    return { latitude: coords.lat, longitude: coords.lon };
  }

  return { latitude: null, longitude: null };
}

describe("Eircode geocoding", () => {
  describe("normalizeEircode", () => {
    it("normalizes valid 7-character eircodes", () => {
      expect(normalizeEircode("D22X2X2")).toBe("D22 X2X2");
      expect(normalizeEircode("d22 x2x2")).toBe("D22 X2X2");
    });

    it("rejects eircodes shorter than 7 characters", () => {
      expect(normalizeEircode("D22X2X")).toBeUndefined();
      expect(normalizeEircode("D22")).toBeUndefined();
    });

    it("corrects common OCR errors", () => {
      expect(normalizeEircode("D22X2O2")).toBe("D22 X202");
    });

    it("returns undefined for empty or short eircodes", () => {
      expect(normalizeEircode("")).toBeUndefined();
      expect(normalizeEircode("D22")).toBeUndefined();
    });
  });

  describe("geocodeEircode", () => {
    it("returns correct coordinates for known routing keys", () => {
      // Test the critical fix: D11 (Finglas) vs D22 (Clondalkin)
      const d11 = geocodeEircode("D11 X2X2");
      const d22 = geocodeEircode("D22 X2X2");
      expect(d11.latitude).toBeCloseTo(53.388, 1);
      expect(d11.longitude).toBeCloseTo(-6.299, 1);
      expect(d22.latitude).toBeCloseTo(53.320, 1);
      expect(d22.longitude).toBeCloseTo(-6.414, 1);
    });

    it("returns null coordinates for unknown routing keys", () => {
      expect(geocodeEircode("Z99 X9X9")).toEqual({
        latitude: null,
        longitude: null
      });
    });

    it("handles invalid eircodes gracefully", () => {
      expect(geocodeEircode("")).toEqual({
        latitude: null,
        longitude: null
      });

      expect(geocodeEircode(undefined)).toEqual({
        latitude: null,
        longitude: null
      });
    });

    it("returns coordinates for major cities", () => {
      const t12 = geocodeEircode("T12 X3Y4");
      const h91 = geocodeEircode("H91 X9X9");
      expect(t12.latitude).toBeCloseTo(51.879, 1);
      expect(t12.longitude).toBeCloseTo(-8.466, 1);
      expect(h91.latitude).toBeCloseTo(53.281, 1);
      expect(h91.longitude).toBeCloseTo(-9.031, 1);
    });
  });

  describe("coordinate accuracy validation", () => {
    it("ensures D11 (Finglas) is north of D22 (Clondalkin)", () => {
      const finglas = geocodeEircode("D11 X2X2");
      const clondalkin = geocodeEircode("D22 X2X2");

      expect(finglas.latitude).toBeGreaterThan(clondalkin.latitude!);
      expect(finglas.longitude).toBeGreaterThan(clondalkin.longitude!);
    });

    it("ensures Dublin coordinates are within expected ranges", () => {
      const dublinCoords = ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11", "D12", "D13", "D14", "D15", "D16", "D17", "D18", "D20", "D22", "D24"];

      dublinCoords.forEach(routingKey => {
        const coords = geocodeEircode(`${routingKey} X2X2`);
        expect(coords.latitude).toBeGreaterThan(53.0);
        expect(coords.latitude).toBeLessThan(54.0);
        expect(coords.longitude).toBeGreaterThan(-6.5);
        expect(coords.longitude).toBeLessThan(-6.0);
      });
    });
  });
});