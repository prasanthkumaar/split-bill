"use server"

import { createAnthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import { env } from "@/env"
import {
  parseBulkEditResult,
  prepareBulkEditInput,
  type BulkEditInput,
} from "./schema"

export async function generateBulkEdit(input: BulkEditInput) {
  const preparedInput = prepareBulkEditInput(input)

  const anthropic = createAnthropic({
    baseURL: env.ANTHROPIC_BASE_URL,
    apiKey: env.ANTHROPIC_API_KEY,
  })

  const result = await generateText({
    model: anthropic(env.ANTHROPIC_MODEL),
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
}

function buildBulkEditPrompt(input: BulkEditInput) {
  const participantList = input.participants
    .map((participant) => `- ${participant.name}`)
    .join("\n")
  const lineItemList = input.lineItems
    .map(
      (lineItem) =>
        `- ${lineItem.name} | lineItemId=${lineItem.id} | quantity=${lineItem.quantity} | unitPrice=${lineItem.unitPrice.toFixed(2)}`
    )
    .join("\n")

  return `You are assigning every bill unit to exactly one participant.

Return ONLY JSON with this exact shape:
{
  "assignments": [
    {
      "lineItemId": "line item id",
      "unitIndex": 0,
      "participantName": "participant name"
    }
  ]
}

Instructions:
${input.instructions}

Participants:
${participantList}

Line items:
${lineItemList}

Rules:
- Every unit must appear exactly once.
- unitIndex is zero-based.
- Use only the provided participant names.
- Use only the provided lineItemId values.
- No markdown fences.
- No explanation.`
}
