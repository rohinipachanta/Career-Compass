/**
 * script/build-firebase.ts
 *
 * Builds the Firebase Functions entry point + the React frontend.
 * Output:
 *   dist/public/        ← served by Firebase Hosting
 *   dist/firebase.cjs   ← deployed as Firebase Functions
 */

import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// These are bundled into the function to reduce cold-start time
const allowlist = [
  "@google/generative-ai",
  "@anthropic-ai/sdk",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "web-push",
  "uuid",
  "ws",
  "zod",
  "zod-validation-error",
];

async function buildFirebase() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client for Firebase Hosting...");
  await viteBuild();

  console.log("building Firebase Functions entry...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  // Keep firebase-functions and firebase-admin external (Firebase provides them)
  const externals = [
    ...allDeps.filter((dep) => !allowlist.includes(dep)),
    "firebase-functions",
    "firebase-admin",
  ];

  await esbuild({
    entryPoints: ["server/firebase-entry.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/firebase.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("Firebase build complete.");
}

buildFirebase().catch((err) => {
  console.error(err);
  process.exit(1);
});
