import { describe, expect, it } from "vitest";
import { estimateRoutingKey, routingKeyCoordinates } from "./lib/eircode-heuristics";

describe("eircode-heuristics", () => {
  describe("routingKeyCoordinates", () => {
    it("contains Dublin routing keys", () => {
      expect(routingKeyCoordinates["D01"]).toBeTruthy();
      expect(routingKeyCoordinates["D02"]).toBeTruthy();
      expect(routingKeyCoordinates["D04"]).toBeTruthy();
    });

    it("contains major city routing keys", () => {
      expect(routingKeyCoordinates["T12"]).toBeTruthy(); // Cork
      expect(routingKeyCoordinates["H91"]).toBeTruthy(); // Galway
      expect(routingKeyCoordinates["V94"]).toBeTruthy(); // Limerick
    });

    it("has valid lat/lon for each key", () => {
      for (const [key, coords] of Object.entries(routingKeyCoordinates)) {
        expect(coords.lat).toBeGreaterThan(51);
        expect(coords.lat).toBeLessThan(56);
        expect(coords.lon).toBeGreaterThan(-11);
        expect(coords.lon).toBeLessThan(-6);
      }
    });

    it("contains over 150 routing keys", () => {
      expect(Object.keys(routingKeyCoordinates).length).toBeGreaterThan(150);
    });
  });

  describe("locality mapping via estimateRoutingKey", () => {
    it("maps Cork addresses to T12", () => {
      expect(estimateRoutingKey("Patrick St, Cork City", "Cork")).toBe("T12");
    });

    it("maps Galway addresses to H91", () => {
      expect(estimateRoutingKey("Shop St, Galway", "Galway")).toBe("H91");
    });

    it("maps Dublin suburbs correctly", () => {
      expect(estimateRoutingKey("Main St, Swords, Co. Dublin", "Dublin")).toBe("K67");
      expect(estimateRoutingKey("Rock Rd, Blackrock", "Dublin")).toBe("A94");
      expect(estimateRoutingKey("George's St, Bray", "Wicklow")).toBe("A98");
    });

    it("maps major towns", () => {
      expect(estimateRoutingKey("West St, Drogheda", "Louth")).toBe("A92");
      expect(estimateRoutingKey("Brewery Rd, Navan", "Meath")).toBe("C15");
      expect(estimateRoutingKey("Church St, Athlone", "Westmeath")).toBe("N37");
    });
  });

  describe("estimateRoutingKey", () => {
    it("extracts Dublin postal district from address", () => {
      const result = estimateRoutingKey("123 Main St, Dublin 4", "Dublin");
      expect(result).toBe("D04");
    });

    it("handles Dublin 6W format", () => {
      const result = estimateRoutingKey("Rathgar, Dublin 6W", "Dublin");
      expect(result).toBe("D6W");
    });

    it("handles Dublin district in county field only", () => {
      const result = estimateRoutingKey("Some Address, Dublin 15", "Dublin");
      expect(result).toBe("D15");
    });

    it("handles lowercase dublin", () => {
      const result = estimateRoutingKey("123 Main St, dublin 2", "dublin");
      expect(result).toBe("D02");
    });

    it("maps Cork addresses to T12", () => {
      const result = estimateRoutingKey("Patrick St, Cork City", "Cork");
      expect(result).toBe("T12");
    });

    it("maps Galway addresses to H91", () => {
      const result = estimateRoutingKey("Shop St, Galway", "Galway");
      expect(result).toBe("H91");
    });

    it("maps Limerick addresses to V94", () => {
      const result = estimateRoutingKey("O'Connell St, Limerick", "Limerick");
      expect(result).toBe("V94");
    });

    it("returns null for unmapped locality", () => {
      const result = estimateRoutingKey("123 Main St, Smalltown", "Unknown");
      expect(result).toBeNull();
    });

    it("returns null for empty address", () => {
      const result = estimateRoutingKey("", "Dublin");
      expect(result).toBeNull();
    });

    it("handles Dublin district without matching word boundary", () => {
      const result = estimateRoutingKey("Dublin 404", "Dublin");
      expect(result).toBeNull();
    });

    it("handles multiple locality matches, returns first", () => {
      const result = estimateRoutingKey("Dublin 2, Cork", "Cork");
      expect(result).toBe("D02");
    });

    it("normalizes case for locality matching", () => {
      const result = estimateRoutingKey("123 Main St, cork city", "Cork");
      expect(result).toBe("T12");
    });

    it("handles padding single digit Dublin districts", () => {
      const result = estimateRoutingKey("Address, Dublin 1", "Dublin");
      expect(result).toBe("D01");
    });

    it("handles double digit Dublin districts", () => {
      const result = estimateRoutingKey("Address, Dublin 18", "Dublin");
      expect(result).toBe("D18");
    });

    it("does not match partial Dublin district numbers", () => {
      const result = estimateRoutingKey("Address, Dublin 145", "Dublin");
      expect(result).toBeNull();
    });
  });
});
