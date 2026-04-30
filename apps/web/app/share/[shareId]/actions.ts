"use server"

import { createAnthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import { env } from "@/env"
import {
  buildDeterministicBulkEditResult,
  parseBulkEditResult,
  prepareBulkEditInput,
  type BulkEditInput,
  type PreparedBulkEditInput,
} from "./schema"

const BULK_EDIT_TIMEOUT_MS = 15_000

export async function generateBulkEdit(input: BulkEditInput) {
  const preparedInput = prepareBulkEditInput(input)
  const deterministicResult = buildDeterministicBulkEditResult(preparedInput)
  if (deterministicResult) {
    return deterministicResult
  }

  const anthropic = createAnthropic({
    baseURL: env.ANTHROPIC_BASE_URL,
    apiKey: env.ANTHROPIC_API_KEY,
  })

  try {
    const result = await generateText({
      model: anthropic(env.ANTHROPIC_MODEL),
      timeout: BULK_EDIT_TIMEOUT_MS,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildBulkEditPrompt(preparedInput),
            },
          ],
        },
      ],
    })

    return parseBulkEditResult(preparedInput, result.text)
  } catch (error) {
    console.error("Bulk edit generation failed:", error)

    if (error instanceof Error) {
      if (error.message === "Bulk edit model returned invalid JSON") {
        throw error
      }

      if (error.name === "AbortError") {
        throw new Error("Bulk edit generation timed out")
      }
    }

    throw new Error("Bulk edit generation failed")
  }
}

function buildBulkEditPrompt(input: PreparedBulkEditInput) {
  const participantList = input.participants
    .map((participant) => `- ${participant.name}`)
    .join("\n")
  const lineItemList = input.lineItems
    .map(
      (lineItem) =>
        `- ${lineItem.name} | lineItemId=${lineItem.id} | quantity=${lineItem.quantity} | unitPrice=${lineItem.unitPrice.toFixed(2)}`
    )
    .join("\n")
  const currentAssignmentList = input.currentAssignments
    .map((assignment) => {
      const participantNames =
        assignment.participantNames.length > 0
          ? assignment.participantNames.join(", ")
          : "(unclaimed)"
      return `- lineItemId=${assignment.lineItemId} | unitIndex=${assignment.unitIndex} | claimers=${participantNames}`
    })
    .join("\n")

  return `You are assigning claimers to every bill unit.

Return ONLY JSON with this exact shape:
{
  "assignments": [
    {
      "lineItemId": "line item id",
      "unitIndex": 0,
      "participantNames": ["participant name"]
    }
  ]
}

Instructions:
${input.instructions}

Participants:
${participantList}

Line items:
${lineItemList}

Current unit assignments:
${currentAssignmentList || "- none"}

Rules:
- Every unit must appear exactly once.
- unitIndex is zero-based.
- participantNames may be empty when nobody should claim that unit.
- participantNames may contain more than one participant when the unit is shared.
- Use only the provided participant names.
- Use only the provided lineItemId values.
- No markdown fences.
- No explanation.`
}
