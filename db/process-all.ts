/**
 * Process all pending/failed documents through the AI pipeline.
 * Run with: npx tsx db/process-all.ts
 */

import {
  getDb,
  getDocument,
  updateDocumentStatus,
  insertFinding,
} from "../lib/db";
import { callClaude, parseAIResponse } from "../lib/claude";
import {
  buildExtractionSystemPrompt,
  buildExtractionUserMessage,
  buildAssessmentPrompt,
} from "../lib/prompts";
import { PRODUCT_TAXONOMY } from "../lib/taxonomy";
import type { ExtractionResult, AssessmentResult } from "../lib/types";

async function processDocument(id: string): Promise<void> {
  const doc = getDocument(id);
  if (!doc) {
    console.error(`  NOT FOUND: ${id}`);
    return;
  }

  console.log(`\nProcessing: "${doc.title}" (${doc.source_regulator})`);
  updateDocumentStatus(id, "pending");

  try {
    const isPDF = doc.content_type === "pdf";
    const systemPrompt = buildExtractionSystemPrompt(
      doc.source_regulator,
      isPDF ? undefined : doc.raw_text,
      doc.publish_date ?? undefined,
    );
    const rawExtraction = await callClaude(buildExtractionUserMessage(), {
      system: systemPrompt,
      ...(isPDF ? { pdfData: doc.raw_text } : {}),
    });
    const extraction = parseAIResponse<ExtractionResult>(rawExtraction);
    console.log(`  → ${extraction.findings.length} findings extracted`);

    let ok = 0,
      fail = 0;
    for (const finding of extraction.findings) {
      try {
        const assessmentPrompt = buildAssessmentPrompt(
          finding,
          PRODUCT_TAXONOMY,
        );
        const rawAssessment = await callClaude(assessmentPrompt);
        const assessment = parseAIResponse<AssessmentResult>(rawAssessment);

        insertFinding({
          document_id: id,
          finding_summary: finding.finding_summary,
          effective_date: finding.effective_date ?? undefined,
          key_quotes: finding.key_quotes,
          severity: assessment.severity,
          severity_rationale: assessment.severity_rationale,
          affected_products: assessment.affected_products,
          recommended_actions: assessment.recommended_actions,
          confidence_score: assessment.confidence_score,
        });
        ok++;
      } catch (err) {
        console.error(
          `    FAIL: ${finding.finding_summary} — ${err instanceof Error ? err.message : String(err)}`,
        );
        fail++;
      }
    }

    updateDocumentStatus(id, "processed");
    console.log(`  ✓ Processed (${ok} saved, ${fail} failed)`);
  } catch (err) {
    updateDocumentStatus(id, "failed");
    console.error(
      `  ✗ Failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function main() {
  const db = getDb();
  const pending = db
    .prepare(
      `SELECT id FROM regulatory_documents WHERE processing_status IN ('pending', 'failed')`,
    )
    .all() as { id: string }[];

  console.log(`Found ${pending.length} document(s) to process`);

  for (const { id } of pending) {
    await processDocument(id);
  }

  const stats = db
    .prepare(
      `SELECT processing_status, COUNT(*) as count FROM regulatory_documents GROUP BY processing_status`,
    )
    .all() as { processing_status: string; count: number }[];

  console.log("\n--- Summary ---");
  stats.forEach(({ processing_status, count }) =>
    console.log(`  ${processing_status}: ${count}`),
  );

  const findingCount = (
    db.prepare("SELECT COUNT(*) as n FROM regulatory_findings").get() as {
      n: number;
    }
  ).n;
  console.log(`  total findings: ${findingCount}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
