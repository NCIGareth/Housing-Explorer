import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("homepage loads with title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Market Intelligence Dashboard");
  });

  test("API health endpoint returns 200", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status", "healthy");
    expect(body).toHaveProperty("dbSize");
    expect(body).toHaveProperty("capacityPercent");
  });

  test("API search returns results", async ({ request }) => {
    const res = await request.get("/api/search?county=Dublin&page=1&pageSize=5");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
  });

  test("API search returns 400 for short query", async ({ request }) => {
    const res = await request.get("/api/search?county=D");
    expect(res.status()).toBe(400);
  });

  test("map section exists", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#map-section")).toBeVisible({ timeout: 10000 });
  });

  test("export button is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /export/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test("county filter defaults to Dublin", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Dublin/i).first()).toBeVisible({ timeout: 10000 });
  });
});
