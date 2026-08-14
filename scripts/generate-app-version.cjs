const fs = require("node:fs");
const path = require("node:path");

const version =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.CI_COMMIT_SHA ||
  `${Date.now()}`;

const outputPath = path.join(
  __dirname,
  "..",
  "src",
  "generated",
  "appVersion.ts",
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `export const APP_VERSION = ${JSON.stringify(String(version).trim())};\n`,
  "utf8",
);

console.log(`[app-version] Generated version: ${version}`);
