#!/usr/bin/env node

/**
 * manifest-sync-lite.mjs — Lightweight manifest sync validation
 *
 * Five checks:
 *   MISSING_MANIFEST_ENTRY  — .tsx file in shared component dirs has no manifest entry
 *   ORPHAN_MANIFEST_ENTRY   — manifest entry with status:"implemented" points to missing file
 *   DEPRECATED_DIRECTORY    — .tsx file exists in deprecated directories (ui/, layout/, feedback/)
 *   MISSING_STORY_FILE      — shared component .tsx has no matching .stories.tsx (ERROR)
 *   MISSING_TEST_FILE       — shared component .tsx has no matching .test.tsx (WARN, non-blocking)
 *
 * Usage:
 *   node scripts/manifest-sync-lite.mjs            # validate all files
 *   node scripts/manifest-sync-lite.mjs --staged    # validate only staged files
 *
 * Exit codes:
 *   0 — all checks pass (warnings do not affect exit code)
 *   1 — one or more errors found
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, extname } from "node:path";

// Resolve paths relative to workspace root (src/)
const WORKSPACE_ROOT = resolve(import.meta.dirname, "..");
const WEB_ROOT = join(WORKSPACE_ROOT, "apps", "web");
const MANIFEST_PATH = join(WORKSPACE_ROOT, "agent-system", "component-manifest.json");

// Shared component directories to validate (relative to apps/web/)
const SHARED_COMPONENT_DIRS = [
  "src/components/atoms",
  "src/components/molecules",
  "src/components/organisms",
  "src/components/data-display",
  "src/components/charts",
];

// Deprecated directories that should not contain .tsx files
const DEPRECATED_DIRS = ["src/components/ui", "src/components/layout", "src/components/feedback"];

const isStaged = process.argv.includes("--staged");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`ERROR: Manifest not found at ${MANIFEST_PATH}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
}

/** Collect all .tsx files recursively from a directory (relative to apps/web/) */
function collectTsxFiles(dirRelativeToWeb) {
  const absDir = join(WEB_ROOT, dirRelativeToWeb);
  if (!existsSync(absDir)) return [];

  const results = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile() &&
        extname(entry.name) === ".tsx" &&
        !entry.name.endsWith(".test.tsx") &&
        !entry.name.endsWith(".stories.tsx")
      ) {
        // Path relative to apps/web/, matching manifest format
        results.push(relative(WEB_ROOT, full).replace(/\\/g, "/"));
      }
    }
  }
  walk(absDir);
  return results;
}

/** Get staged files (relative to git root), filtered to web app .tsx files */
function getStagedFiles() {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
      cwd: gitRoot,
    });
    return output
      .split("\n")
      .filter(Boolean)
      .map((f) => f.replace(/\\/g, "/"))
      .filter((f) => f.startsWith("src/apps/web/") && f.endsWith(".tsx"))
      .map((f) => f.replace("src/apps/web/", "")); // convert to manifest-relative path
  } catch {
    console.error("WARNING: Could not get staged files. Falling back to full scan.");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function checkMissingManifestEntries(manifest, filesToCheck) {
  // Build set of all manifest paths
  const manifestPaths = new Set();
  for (const category of manifest.categories) {
    for (const component of category.components) {
      manifestPaths.add(component.path);
    }
  }

  const errors = [];

  // Determine which .tsx files to validate
  let tsxFiles;
  if (filesToCheck) {
    // --staged mode: only check staged files that are in shared component dirs
    tsxFiles = filesToCheck.filter((f) =>
      SHARED_COMPONENT_DIRS.some((dir) => f.startsWith(dir + "/")),
    );
    // Exclude test and story files
    tsxFiles = tsxFiles.filter((f) => !f.endsWith(".test.tsx") && !f.endsWith(".stories.tsx"));
  } else {
    // Full scan: collect all .tsx files from shared component dirs
    tsxFiles = SHARED_COMPONENT_DIRS.flatMap(collectTsxFiles);
  }

  for (const file of tsxFiles) {
    if (!manifestPaths.has(file)) {
      errors.push({
        check: "MISSING_MANIFEST_ENTRY",
        file,
        message: `Component file has no manifest entry: ${file}`,
      });
    }
  }

  return errors;
}

function checkOrphanManifestEntries(manifest) {
  const errors = [];

  for (const category of manifest.categories) {
    for (const component of category.components) {
      if (component.status !== "implemented") continue;

      const absPath = join(WEB_ROOT, component.path);
      if (!existsSync(absPath)) {
        errors.push({
          check: "ORPHAN_MANIFEST_ENTRY",
          file: component.path,
          message: `Manifest entry "${component.name}" (status: implemented) points to missing file: ${component.path}`,
        });
      }
    }
  }

  return errors;
}

function checkDeprecatedDirectories(filesToCheck) {
  const errors = [];

  let tsxFiles;
  if (filesToCheck) {
    // --staged mode: only check staged files in deprecated dirs
    tsxFiles = filesToCheck.filter((f) => DEPRECATED_DIRS.some((dir) => f.startsWith(dir + "/")));
    tsxFiles = tsxFiles.filter((f) => f.endsWith(".tsx"));
  } else {
    // Full scan: collect from deprecated dirs
    tsxFiles = DEPRECATED_DIRS.flatMap(collectTsxFiles);
  }

  for (const file of tsxFiles) {
    errors.push({
      check: "DEPRECATED_DIRECTORY",
      file,
      message: `File in deprecated directory: ${file}. Migrate to atoms/, molecules/, or organisms/.`,
    });
  }

  return errors;
}

function checkMissingStoryFiles(filesToCheck) {
  const errors = [];

  let tsxFiles;
  if (filesToCheck) {
    tsxFiles = filesToCheck.filter((f) =>
      SHARED_COMPONENT_DIRS.some((dir) => f.startsWith(dir + "/")),
    );
    tsxFiles = tsxFiles.filter((f) => !f.endsWith(".test.tsx") && !f.endsWith(".stories.tsx"));
  } else {
    tsxFiles = SHARED_COMPONENT_DIRS.flatMap(collectTsxFiles);
  }

  for (const file of tsxFiles) {
    const storyFile = file.replace(/\.tsx$/, ".stories.tsx");
    const absStoryFile = join(WEB_ROOT, storyFile);
    if (!existsSync(absStoryFile)) {
      errors.push({
        check: "MISSING_STORY_FILE",
        file,
        message: `Component file has no matching story: ${file} (expected: ${storyFile})`,
      });
    }
  }

  return errors;
}

function checkMissingTestFiles(filesToCheck) {
  const warnings = [];

  let tsxFiles;
  if (filesToCheck) {
    tsxFiles = filesToCheck.filter((f) =>
      SHARED_COMPONENT_DIRS.some((dir) => f.startsWith(dir + "/")),
    );
    tsxFiles = tsxFiles.filter((f) => !f.endsWith(".test.tsx") && !f.endsWith(".stories.tsx"));
  } else {
    tsxFiles = SHARED_COMPONENT_DIRS.flatMap(collectTsxFiles);
  }

  for (const file of tsxFiles) {
    const testFile = file.replace(/\.tsx$/, ".test.tsx");
    const absTestFile = join(WEB_ROOT, testFile);
    if (!existsSync(absTestFile)) {
      warnings.push({
        check: "MISSING_TEST_FILE",
        file,
        message: `Component file has no matching test: ${file} (expected: ${testFile})`,
      });
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const manifest = loadManifest();
  const stagedFiles = isStaged ? getStagedFiles() : null;

  // If --staged and we got an empty list, nothing to check
  if (isStaged && stagedFiles && stagedFiles.length === 0) {
    console.log("manifest-sync-lite: No staged .tsx files to check. OK.");
    process.exit(0);
  }

  const allErrors = [
    ...checkMissingManifestEntries(manifest, stagedFiles),
    ...checkOrphanManifestEntries(manifest),
    ...checkDeprecatedDirectories(stagedFiles),
    ...checkMissingStoryFiles(stagedFiles),
  ];

  const allWarnings = checkMissingTestFiles(stagedFiles);

  // Print warnings (non-blocking)
  if (allWarnings.length > 0) {
    console.warn(`\nmanifest-sync-lite: ${allWarnings.length} warning(s):\n`);
    for (const warning of allWarnings) {
      console.warn(`  WARN  [${warning.check}] ${warning.message}`);
    }
    console.warn("");
  }

  if (allErrors.length === 0) {
    console.log("manifest-sync-lite: All checks passed.");
    process.exit(0);
  }

  console.error(`\nmanifest-sync-lite: ${allErrors.length} error(s) found:\n`);
  for (const error of allErrors) {
    console.error(`  ERROR [${error.check}] ${error.message}`);
  }
  console.error("");
  process.exit(1);
}

main();
