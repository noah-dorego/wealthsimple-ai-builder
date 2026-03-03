import { getDocument, updateDocumentStatus, insertFinding } from "@/lib/db";
import { callClaude, parseAIResponse } from "@/lib/claude";
import {
  buildExtractionSystemPrompt,
  buildExtractionUserMessage,
  buildAssessmentPrompt,
} from "@/lib/prompts";
import { PRODUCT_TAXONOMY } from "@/lib/taxonomy";
import type { ExtractionResult, AssessmentResult } from "@/lib/types";

export async function runPipeline(
  id: string,
): Promise<{ findings_extracted: number; findings_failed: number }> {
  const doc = getDocument(id);
  if (!doc) throw new Error(`Document not found: ${id}`);

  updateDocumentStatus(id, "pending");

  try {
    // EXTRACTION — one Claude call
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

    // ASSESSMENT + PERSIST — one Claude call per finding, sequential
    let findingsFailed = 0;
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
      } catch (err) {
        console.error(
          `Failed to assess/persist finding "${finding.finding_summary}": ${err instanceof Error ? err.message : String(err)}`,
        );
        findingsFailed++;
      }
    }

    updateDocumentStatus(id, "processed");

    return {
      findings_extracted: extraction.findings.length,
      findings_failed: findingsFailed,
    };
  } catch (err) {
    updateDocumentStatus(id, "failed");
    throw err;
  }
}
