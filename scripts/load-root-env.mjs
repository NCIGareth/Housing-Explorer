import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Loads `.env.example` first (defaults for local dev), then `.env` (secrets / overrides).
 */
export function loadRootEnv() {
  const examplePath = resolve(repoRoot, ".env.example");
  const envPath = resolve(repoRoot, ".env");

  if (existsSync(examplePath)) {
    config({ path: examplePath });
  }
  if (existsSync(envPath)) {
    config({ path: envPath, override: true });
  }
}
