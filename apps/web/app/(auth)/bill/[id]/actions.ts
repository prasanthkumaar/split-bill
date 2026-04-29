import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { env } from "@/env"
import {
  parseReceiptInputSchema,
  parseReceiptResultSchema,
  type ParseReceiptInput,
} from "./schema"

const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])
const MAX_RECEIPT_BASE64_CHARS = 10 * 1024 * 1024

export class ReceiptParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReceiptParseError"
  }
}

export async function parseReceipt(input: ParseReceiptInput) {
  const { imageBase64, mimeType } = parseReceiptInputSchema.parse(input)

  if (!ALLOWED_RECEIPT_MIME_TYPES.has(mimeType)) {
    throw new ReceiptParseError("Unsupported image type")
  }

  if (imageBase64.length > MAX_RECEIPT_BASE64_CHARS) {
    throw new ReceiptParseError("Receipt image is too large")
  }

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

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(result.text)
  } catch {
    throw new ReceiptParseError("Model returned invalid JSON")
  }

  const parsedResult = parseReceiptResultSchema.safeParse(parsedJson)
  if (!parsedResult.success) {
    throw new ReceiptParseError("Failed to parse receipt data from image")
  }

  return parsedResult.data
}
