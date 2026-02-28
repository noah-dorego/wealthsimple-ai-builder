/**
 * Seed script — reads .txt files from seed-documents/ and inserts them into the DB.
 *
 * Filename naming convention: {SOURCE_AGENCY}_{descriptive-title}.txt
 *   - SOURCE_AGENCY: exact agency key (e.g. CRA, CIRO, FINTRAC)
 *   - descriptive-title: kebab-case human-readable title slug
 *
 * Examples:
 *   CRA_tfsa-contribution-room-update.txt  →  title: "Tfsa Contribution Room Update", agency: CRA
 *   CIRO_margin-rule-amendment-2025.txt    →  title: "Margin Rule Amendment 2025", agency: CIRO
 */

import fs from 'fs'
import path from 'path'
import { insertDocument } from '../lib/db'
import type { SourceAgency } from '../lib/types'

const SEED_DIR = path.join(process.cwd(), 'seed-documents')

function kebabToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function seed() {
  if (!fs.existsSync(SEED_DIR)) {
    console.error(`seed-documents/ directory not found at ${SEED_DIR}`)
    process.exit(1)
  }

  const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.txt'))

  if (files.length === 0) {
    console.log('No .txt files found in seed-documents/ — nothing to seed.')
    return
  }

  let inserted = 0
  let failed = 0

  for (const filename of files) {
    const nameWithoutExt = path.basename(filename, '.txt')
    const underscoreIdx = nameWithoutExt.indexOf('_')

    if (underscoreIdx === -1) {
      console.warn(`  SKIP  ${filename} — filename must be {SOURCE_AGENCY}_{title-slug}.txt`)
      failed++
      continue
    }

    const sourceAgency = nameWithoutExt.slice(0, underscoreIdx) as SourceAgency
    const titleSlug = nameWithoutExt.slice(underscoreIdx + 1)
    const title = kebabToTitle(titleSlug)

    const filePath = path.join(SEED_DIR, filename)
    const raw_text = fs.readFileSync(filePath, 'utf-8')

    try {
      const id = insertDocument({ title, source_agency: sourceAgency, raw_text })
      console.log(`  OK    ${filename} → id=${id} title="${title}" agency=${sourceAgency}`)
      inserted++
    } catch (err) {
      console.error(`  FAIL  ${filename} — ${err instanceof Error ? err.message : String(err)}`)
      failed++
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Failed: ${failed}`)
}

seed().catch((err) => {
  console.error('Seed script error:', err)
  process.exit(1)
})
