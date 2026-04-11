import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { loadRootEnv, repoRoot } from "./load-root-env.mjs";

loadRootEnv();

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Ensure .env.example exists and/or copy it to .env in the repo root."
  );
  process.exit(1);
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/prisma-with-env.mjs <prisma subcommand> [...args]");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...prismaArgs], {
  cwd: resolve(repoRoot, "packages/db"),
  stdio: "inherit",
  env: process.env,
  shell: true
});

process.exit(result.status ?? 1);
