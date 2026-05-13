import { test, expect } from "@playwright/test";

let dbAvailable = false;

test.beforeAll(async ({ request }) => {
  try {
    const res = await request.get("/api/health");
    dbAvailable = res.status() === 200;
  } catch {
    dbAvailable = false;
  }
});

test.describe("Smoke tests", () => {
  test("homepage loads with title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Market Intelligence Dashboard");
  });

  test("API health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(["healthy", "unhealthy"]).toContain(body.status);
    expect(body).toHaveProperty("timestamp");
  });

  test("API search returns results", async ({ request }) => {
    test.skip(!dbAvailable, "Skipping: database not available in CI");
    const res = await request.get("/api/search?q=Dublin&page=1&pageSize=5");
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("API search returns 400 for short query", async ({ request }) => {
    test.skip(!dbAvailable, "Skipping: database not available in CI");
    const res = await request.get("/api/search?q=D");
    expect(res.status()).toBe(400);
  });

  test("map section exists", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#map-section")).toBeVisible({ timeout: 10000 });
  });

  test("export link is present", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Download search results as CSV" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("county filter defaults to Dublin", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Dublin/i).first()).toBeVisible({ timeout: 10000 });
  });
});
