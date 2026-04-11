import { spawnSync } from "node:child_process";
import { loadRootEnv } from "./load-root-env.mjs";

loadRootEnv();

const cmd = process.argv[2];
const args = process.argv.slice(3);
if (!cmd) {
  console.error("Usage: node scripts/run-with-root-env.mjs <command> [...args]");
  process.exit(1);
}

const result = spawnSync(cmd, args, {
  stdio: "inherit",
  env: process.env,
  shell: true
});

process.exit(result.status ?? 1);
