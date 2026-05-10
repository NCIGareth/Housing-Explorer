import { createWriteStream, existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import https from "node:https";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const ZIP_URL = "https://www.propertypriceregister.ie/website/npsra/ppr/npsra-ppr.nsf/Downloads/PPR-ALL.zip/$FILE/PPR-ALL.zip";
const ZIP_PATH = join(repoRoot, "PPR-ALL.zip");
const CSV_PATH = join(repoRoot, "PPR-ALL.csv");

async function download(url, dest) {
  console.log("Downloading PPR-ALL.zip...");
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, { rejectUnauthorized: false }, (res) => {
      if (res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      pipeline(res, file).then(resolve).catch(reject);
    }).on("error", reject);
  });
}

function extractZip(zipPath, csvPath) {
  console.log("Extracting PPR-ALL.zip...");
  return new Promise((resolve, reject) => {
    const proc = spawn("tar", ["-xf", zipPath, "-C", repoRoot]);
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

async function main() {
  if (existsSync(CSV_PATH)) {
    console.log("PPR-ALL.csv already exists, skipping download.");
    return;
  }

  await download(ZIP_URL, ZIP_PATH);
  await extractZip(ZIP_PATH, CSV_PATH);
  await unlink(ZIP_PATH);
  console.log("Done. PPR-ALL.csv ready.");
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
