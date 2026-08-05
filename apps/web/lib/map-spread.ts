/**
 * Spreads points that resolve to (near-)identical coordinates so every marker
 * stays visible instead of stacking. The first point in each coincident group
 * keeps the true position (the current sale); the rest fan out in a ring.
 * Distances are in projected (web mercator) metres.
 */
export function spreadCoincident(
  points: Array<{ id: string; x: number; y: number }>,
  baseRadius = 30,
  step = 30
): Map<string, { x: number; y: number }> {
  const groups = new Map<string, Array<{ id: string; x: number; y: number }>>();
  for (const p of points) {
    const key = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const group = groups.get(key) ?? [];
    group.push(p);
    groups.set(key, group);
  }

  const result = new Map<string, { x: number; y: number }>();
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.set(group[0].id, { x: group[0].x, y: group[0].y });
      continue;
    }
    group.forEach((p, idx) => {
      if (idx === 0) {
        result.set(p.id, { x: p.x, y: p.y });
        return;
      }
      const angle = (2 * Math.PI * (idx - 1)) / (group.length - 1);
      const radius = baseRadius + (idx - 1) * step;
      result.set(p.id, { x: p.x + radius * Math.cos(angle), y: p.y + radius * Math.sin(angle) });
    });
  }
  return result;
}
