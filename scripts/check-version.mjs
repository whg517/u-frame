import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const tauriConfig = JSON.parse(
  readFileSync(resolve(root, "src-tauri/tauri.conf.json"), "utf8"),
);
const cargoToml = readFileSync(resolve(root, "src-tauri/Cargo.toml"), "utf8");
const cargoPackage = cargoToml.match(
  /^\[package\]\s*$[\s\S]*?^version\s*=\s*"([^"]+)"\s*$/m,
);

if (!cargoPackage) {
  console.error("ERROR: Cannot read [package].version from src-tauri/Cargo.toml");
  process.exit(1);
}

const versions = {
  "package.json": packageJson.version,
  "src-tauri/Cargo.toml": cargoPackage[1],
  "src-tauri/tauri.conf.json": tauriConfig.version,
};
const uniqueVersions = new Set(Object.values(versions));
if (uniqueVersions.size !== 1) {
  console.error("ERROR: Application versions are inconsistent:");
  for (const [file, version] of Object.entries(versions)) {
    console.error(`  ${file}: ${version}`);
  }
  process.exit(1);
}

const [version] = uniqueVersions;
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
if (!semverPattern.test(version)) {
  console.error(`ERROR: Application version is not valid SemVer: ${version}`);
  process.exit(1);
}

const releaseTag = process.argv[2];
if (releaseTag && releaseTag !== `v${version}`) {
  console.error(`ERROR: Release tag ${releaseTag} does not match application version v${version}`);
  process.exit(1);
}

console.log(
  releaseTag
    ? `Version ${version} matches ${releaseTag}.`
    : `Application version ${version} is consistent.`,
);
