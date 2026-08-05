import { spreadCoincident } from "../../lib/map-spread";

describe("spreadCoincident", () => {
  it("keeps the first point of a coincident group at the true position", () => {
    const points = [
      { id: "sale", x: 100, y: 100 },
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 100, y: 100 },
    ];
    const result = spreadCoincident(points);
    expect(result.get("sale")).toEqual({ x: 100, y: 100 });
  });

  it("spreads coincident points to distinct positions", () => {
    const points = [
      { id: "sale", x: 100, y: 100 },
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 100, y: 100 },
      { id: "c", x: 100, y: 100 },
    ];
    const result = spreadCoincident(points);
    const ids = points.map((p) => p.id);
    const positions = ids.map((id) => result.get(id));
    const unique = new Set(positions.map((p) => `${p!.x},${p!.y}`));
    expect(unique.size).toBe(4);
    for (const id of ids) {
      expect(result.has(id)).toBe(true);
    }
  });

  it("leaves non-coincident points untouched", () => {
    const points = [
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 200, y: 200 },
    ];
    const result = spreadCoincident(points);
    expect(result.get("a")).toEqual({ x: 100, y: 100 });
    expect(result.get("b")).toEqual({ x: 200, y: 200 });
  });

  it("spreads each coincident group independently", () => {
    const points = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 0, y: 0 },
      { id: "c", x: 500, y: 500 },
      { id: "d", x: 500, y: 500 },
    ];
    const result = spreadCoincident(points);
    const aPos = result.get("a")!;
    const cPos = result.get("c")!;
    expect(aPos.x).toBeLessThan(200);
    expect(cPos.x).toBeGreaterThan(300);
  });

  it("returns an empty map for empty input", () => {
    expect(spreadCoincident([]).size).toBe(0);
  });
});
