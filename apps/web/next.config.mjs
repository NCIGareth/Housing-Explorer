import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

// Next.js only auto-loads `.env*` from `apps/web`. Prisma needs `DATABASE_URL` from the monorepo root.
config({ path: resolve(repoRoot, ".env.example") });
config({ path: resolve(repoRoot, ".env"), override: true });

/** @type {import('next').NextConfig} */
const nextConfig = {};


export default nextConfig;
