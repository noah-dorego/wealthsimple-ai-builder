/**
 * Seed script — reads .txt files from seed-documents/ and inserts them into the DB.
 *
 * Filename naming convention: {SOURCE_REGULATOR}_{descriptive-title}.txt
 *   - SOURCE_REGULATOR: exact regulator key (e.g. CRA, CIRO, FINTRAC)
 *   - descriptive-title: kebab-case human-readable title slug
 *
 * Examples:
 *   CRA_tfsa-contribution-room-update.txt  →  title: "Tfsa Contribution Room Update", regulator: CRA
 *   CIRO_margin-rule-amendment-2025.txt    →  title: "Margin Rule Amendment 2025", regulator: CIRO
 */

import fs from "fs";
import path from "path";
import { getDb, insertDocument } from "../lib/db";
import type { SourceRegulator } from "../lib/types";

const SEED_DIR = path.join(process.cwd(), "seed-documents");

function kebabToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function seed() {
  if (!fs.existsSync(SEED_DIR)) {
    console.error(`seed-documents/ directory not found at ${SEED_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith(".txt"));

  if (files.length === 0) {
    console.log("No .txt files found in seed-documents/ — nothing to seed.");
    return;
  }

  const db = getDb();
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of files) {
    const nameWithoutExt = path.basename(filename, ".txt");
    const underscoreIdx = nameWithoutExt.indexOf("_");

    if (underscoreIdx === -1) {
      console.warn(
        `  SKIP  ${filename} — filename must be {SOURCE_REGULATOR}_{title-slug}.txt`,
      );
      failed++;
      continue;
    }

    const sourceRegulator = nameWithoutExt.slice(
      0,
      underscoreIdx,
    ) as SourceRegulator;
    const titleSlug = nameWithoutExt.slice(underscoreIdx + 1);
    const title = kebabToTitle(titleSlug);

    const existing = db
      .prepare(
        "SELECT id FROM regulatory_documents WHERE title = ? AND source_regulator = ?",
      )
      .get(title, sourceRegulator) as { id: string } | undefined;

    if (existing) {
      console.log(
        `  DUPE  ${filename} — already exists (id=${existing.id}), skipping`,
      );
      skipped++;
      continue;
    }

    const filePath = path.join(SEED_DIR, filename);
    const raw_text = fs.readFileSync(filePath, "utf-8");

    try {
      const id = insertDocument({
        title,
        source_regulator: sourceRegulator,
        raw_text,
        content_type: "text",
      });
      console.log(
        `  OK    ${filename} → id=${id} title="${title}" regulator=${sourceRegulator}`,
      );
      inserted++;
    } catch (err) {
      console.error(
        `  FAIL  ${filename} — ${err instanceof Error ? err.message : String(err)}`,
      );
      failed++;
    }
  }

  console.log(
    `\nDone. Inserted: ${inserted}, Skipped: ${skipped}, Failed: ${failed}`,
  );
}

// Only run when executed directly (npm run seed)
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seed().catch((err) => {
    console.error("Seed script error:", err);
    process.exit(1);
  });
}
