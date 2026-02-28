import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function callClaude(
  prompt: string,
  model = 'claude-sonnet-4-20250514'
): Promise<string> {
  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  if (block.type !== 'text') {
    throw new Error(`Expected text response from Claude, got: ${block.type}`)
  }

  return block.text
}

export function parseAIResponse<T>(raw: string): T {
  // Strip ```json ... ``` fences if present
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(stripped) as T
  } catch (err) {
    throw new Error(
      `Failed to parse AI response as JSON: ${err instanceof Error ? err.message : String(err)}\n\nRaw response:\n${raw}`
    )
  }
}
