import { describe, expect, it } from "vitest";
import { removeListingDuplicates } from "./lib/quality";

describe("removeListingDuplicates", () => {
  it("removes duplicates by source and externalId", () => {
    const deduped = removeListingDuplicates([
      { source: "A", externalId: "1" },
      { source: "A", externalId: "1" },
      { source: "A", externalId: "2" }
    ]);

    expect(deduped).toHaveLength(2);
  });
});
