import type { ExtractedFinding } from "./types";
import { PRODUCT_TAXONOMY } from "./taxonomy";

export function buildExtractionSystemPrompt(
  sourceRegulator: string,
  documentText?: string,
  publishDate?: string,
): string {
  const publishDateTag = publishDate
    ? `\n  <publish_date>${publishDate}</publish_date>`
    : "";

  const documentBlock = documentText
    ? `\n<document>\n  <source_regulator>${sourceRegulator}</source_regulator>${publishDateTag}\n  <text>\n${documentText}\n  </text>\n</document>`
    : `\n<document>\n  <source_regulator>${sourceRegulator}</source_regulator>${publishDateTag}\n</document>`;

  return `You are a regulatory compliance analyst specializing in Canadian financial regulation. Your task is to extract all discrete regulatory findings from the provided document.
${documentBlock}

<rules>
- Extract each discrete finding as a separate item — do not combine multiple findings into one
- Use precise dates exactly as stated in the document; use null if not specified
- If the document says "effective immediately" and a publish_date is provided, use that date
- Include verbatim key quotes from the document that support each finding
- Include regulatory references (e.g., section numbers, rule citations, bulletin IDs) mentioned in the document for each finding
- Include keywords from the finding that would help identify which product lines are affected
- Do not speculate or infer information not present in the document
- Your response must be valid JSON only — no prose, no markdown fences
</rules>

<output_format>
{
  "findings": [
    {
      "finding_summary": "string — concise description of the regulatory finding",
      "effective_date": "string | null — ISO date (YYYY-MM-DD) or null",
      "key_quotes": ["string — verbatim quote from document"],
      "category": "new_rule | amendment | guidance | enforcement | consultation | deadline | threshold_change | null",
      "regulatory_references": ["string — section number, rule citation, bulletin ID, or other reference"],
      "affected_keywords": ["string — keyword that helps identify affected product lines"]
    }
  ]
}
</output_format>`;
}

export function buildExtractionUserMessage(): string {
  return "Extract all regulatory findings from this document.";
}

export function buildAssessmentPrompt(
  finding: ExtractedFinding,
  taxonomy: typeof PRODUCT_TAXONOMY,
): string {
  return `<task>
You are a regulatory impact analyst at a Canadian fintech company. Assess the impact of the provided regulatory finding on our product lines.
Return a JSON object matching the AssessmentResult schema exactly.
</task>

<rules>
- Map affected_products based on keyword matches between the change and the taxonomy
- Only include products genuinely impacted — do not include all products by default
- Assign severity (low/medium/high/critical) with a clear rationale explaining your reasoning. Use the severity scale to help you make the decision.
- Provide concrete, actionable recommended_actions specific to the change
- confidence_score should reflect how certain you are about the impact mapping (0.0 to 1.0)
- Your response must be valid JSON only — no prose, no markdown fences
</rules>

<severity_scale>
- critical: the change is likely to have a significant impact on the product line (e.g. rules/regulations that require immediate change to the product)
- high: the change is likely to have a moderate impact on the product line (e.g. rules/regulations that require change to the product)
- medium: the change is likely to have a minor impact on the product line (e.g. rules/regulations that should be known)
- low: the change is likely to have no impact on the product line (e.g. rules/regulations that are not relevant to the product)
</severity_scale>

<taxonomy>
${JSON.stringify(taxonomy, null, 2)}
</taxonomy>

<finding>
${JSON.stringify(finding, null, 2)}
</finding>

<output_format>
{
  "affected_products": ["ProductKey — one of the keys from the taxonomy"],
  "severity": "low | medium | high | critical",
  "severity_rationale": "string — explanation of why this severity was assigned",
  "recommended_actions": ["string — concrete action item for compliance team"],
  "confidence_score": 0.0
}
</output_format>`;
}
