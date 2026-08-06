import { getCapacityMb } from "@/lib/db-capacity";

const ORIGINAL_CAPACITY = process.env.DB_CAPACITY_MB;
const ORIGINAL_URL = process.env.DATABASE_URL;

function setEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterAll(() => {
  setEnv({ DB_CAPACITY_MB: ORIGINAL_CAPACITY, DATABASE_URL: ORIGINAL_URL });
});

describe("getCapacityMb", () => {
  it("uses DB_CAPACITY_MB when set", () => {
    setEnv({ DB_CAPACITY_MB: "8192", DATABASE_URL: undefined });
    expect(getCapacityMb()).toBe(8192);
  });

  it("defaults to 500 MB for Supabase URLs", () => {
    setEnv({
      DB_CAPACITY_MB: undefined,
      DATABASE_URL: "postgresql://postgres:pass@db.xxxx.supabase.co:5432/postgres",
    });
    expect(getCapacityMb()).toBe(500);
  });

  it("defaults to 50 GB for self-hosted PostGIS", () => {
    setEnv({
      DB_CAPACITY_MB: undefined,
      DATABASE_URL: "postgresql://housing:pass@db:5432/housing",
    });
    expect(getCapacityMb()).toBe(51200);
  });
});
