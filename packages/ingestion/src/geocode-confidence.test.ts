import { describe, expect, it } from "vitest";
import {
  computeCoordinateConfidence,
  isVagueAddress,
  scoreFromErrorMeters,
} from "./lib/geocode-confidence";

describe("geocode-confidence", () => {
  describe("computeCoordinateConfidence", () => {
    it("scores exact coordinates as high precision", () => {
      const r = computeCoordinateConfidence({
        latitude: 53.35,
        longitude: -6.26,
        estimatedLatitude: null,
        estimatedLongitude: null,
        estimatedEircode: null,
        address: "12 Main Street",
      });
      expect(r.confidence).toBe(100);
      expect(r.errorMeters).toBe(50);
    });

    it("downgrades exact coordinates for vague addresses", () => {
      const r = computeCoordinateConfidence({
        latitude: 53.35,
        longitude: -6.26,
        estimatedLatitude: null,
        estimatedLongitude: null,
        estimatedEircode: null,
        address: "Site at Main Street",
      });
      expect(r.confidence).toBe(85);
      expect(r.errorMeters).toBe(200);
    });

    it("uses the measured per-routing-key error for estimated points", () => {
      const r = computeCoordinateConfidence({
        latitude: null,
        longitude: null,
        estimatedLatitude: 53.321,
        estimatedLongitude: -6.263,
        estimatedEircode: "D06",
        address: "12 Main Street",
        errorByRoutingKey: new Map([["D06", 1400]]),
      });
      expect(r.errorMeters).toBe(1400);
      expect(r.confidence).toBe(65);
    });

    it("falls back to a default error when no measured value exists", () => {
      const r = computeCoordinateConfidence({
        latitude: null,
        longitude: null,
        estimatedLatitude: 53.321,
        estimatedLongitude: -6.263,
        estimatedEircode: "N91",
        address: "12 Main Street",
        errorByRoutingKey: new Map(),
      });
      expect(r.errorMeters).toBe(5000);
      expect(r.confidence).toBe(50);
    });

    it("returns null confidence for rows with no coordinates", () => {
      const r = computeCoordinateConfidence({
        latitude: null,
        longitude: null,
        estimatedLatitude: null,
        estimatedLongitude: null,
        estimatedEircode: null,
        address: "12 Main Street",
      });
      expect(r.confidence).toBeNull();
      expect(r.errorMeters).toBeNull();
    });
  });

  describe("scoreFromErrorMeters", () => {
    it("does not increase as error grows", () => {
      const errors = [50, 250, 500, 1000, 2000, 4000, 8000, 15000, 50000];
      for (let i = 1; i < errors.length; i++) {
        expect(scoreFromErrorMeters(errors[i])).toBeLessThanOrEqual(scoreFromErrorMeters(errors[i - 1]));
      }
    });
  });

  describe("isVagueAddress", () => {
    it.each([
      ["Site at Monksland", true],
      ["Lands at Derrybeg", true],
      ["Part of 5 Smithfield", true],
      ["Portion of lands", true],
      ["12 Main Street", false],
      ["Apartment 3, The Maltings", false],
    ])("%s -> %s", (address, expected) => {
      expect(isVagueAddress(address)).toBe(expected);
    });
  });
});
