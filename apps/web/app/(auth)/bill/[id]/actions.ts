"use server"

import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { env } from "@/env"
import {
  parseReceiptInputSchema,
  parseReceiptResultSchema,
  type ParseReceiptInput,
} from "./schema"

export async function parseReceipt(input: ParseReceiptInput) {
  const { imageBase64, mimeType } = parseReceiptInputSchema.parse(input)

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
            type: "image",
            image: imageBase64,
            mediaType: mimeType,
          },
          {
            type: "text",
            text: `Extract all line items from this receipt image. Return ONLY a JSON object with this exact structure, no other text:

{
  "items": [
    { "name": "item name", "quantity": 1, "unitPrice": 10.00 }
  ],
  "tax": 0,
  "serviceCharge": 0
}

Rules:
- quantity defaults to 1 if not shown
- unitPrice is the price per unit (divide total by quantity if needed)
- tax is the total tax amount (0 if not shown)
- serviceCharge is the service charge amount (0 if not shown)
- Use exact values from the receipt
- Return ONLY the JSON, no markdown fences, no explanation`,
          },
        ],
      },
    ],
  })

  return parseReceiptResultSchema.parse(JSON.parse(result.text))
}
