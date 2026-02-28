import type { ExtractedChange } from './types'
import { PRODUCT_TAXONOMY } from './taxonomy'

export function buildExtractionPrompt(documentText: string, sourceAgency: string): string {
  return `<task>
You are a regulatory compliance analyst. Extract all discrete regulatory changes from the provided document.
Return a JSON object matching the ExtractionResult schema exactly.
</task>

<rules>
- Extract each discrete change as a separate item — do not combine multiple changes into one
- Use precise dates exactly as stated in the document; use null if not specified
- Include verbatim key quotes from the document that support each change
- Do not speculate or infer information not present in the document
- Your response must be valid JSON only — no prose, no markdown fences
</rules>

<source_agency>${sourceAgency}</source_agency>

<document>
${documentText}
</document>

<output_format>
{
  "changes": [
    {
      "change_summary": "string — concise description of the regulatory change",
      "effective_date": "string | null — ISO date (YYYY-MM-DD) or null",
      "key_quotes": ["string — verbatim quote from document"],
      "category": "new_rule | amendment | guidance | enforcement | consultation | null"
    }
  ],
  "document_summary": "string — 2-3 sentence summary of the document as a whole"
}
</output_format>`
}

export function buildAssessmentPrompt(
  change: ExtractedChange,
  taxonomy: typeof PRODUCT_TAXONOMY
): string {
  return `<task>
You are a regulatory impact analyst at a Canadian fintech company. Assess the impact of the provided regulatory change on our product lines.
Return a JSON object matching the AssessmentResult schema exactly.
</task>

<rules>
- Map affected_products based on keyword matches between the change and the taxonomy
- Only include products genuinely impacted — do not include all products by default
- Assign severity (low/medium/high/critical) with a clear rationale explaining your reasoning
- Provide concrete, actionable recommended_actions specific to the change
- confidence_score should reflect how certain you are about the impact mapping (0.0 to 1.0)
- Your response must be valid JSON only — no prose, no markdown fences
</rules>

<taxonomy>
${JSON.stringify(taxonomy, null, 2)}
</taxonomy>

<change>
${JSON.stringify(change, null, 2)}
</change>

<output_format>
{
  "affected_products": ["ProductKey — one of the keys from the taxonomy"],
  "severity": "low | medium | high | critical",
  "severity_rationale": "string — explanation of why this severity was assigned",
  "recommended_actions": ["string — concrete action item for compliance team"],
  "confidence_score": 0.0
}
</output_format>`
}
