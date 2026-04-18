import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

const envExamplePath = resolve(repoRoot, ".env.example");
const envPath = resolve(repoRoot, ".env");

// Next.js only auto-loads `.env*` from `apps/web`. Prisma needs `DATABASE_URL` from the monorepo root.
if (existsSync(envExamplePath)) {
  config({ path: envExamplePath });
}
if (existsSync(envPath)) {
  config({ path: envPath, override: true });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@housing/db", "@housing/shared"],
};

export default nextConfig;
