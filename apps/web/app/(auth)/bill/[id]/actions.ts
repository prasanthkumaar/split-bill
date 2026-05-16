import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { env } from "@/env"
import {
  parseReceiptInputSchema,
  parseReceiptResultSchema,
  type ParseReceiptInput,
  type ParseReceiptResult,
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
            text: `Extract all charged line items from this receipt image. Return ONLY a JSON object with this exact structure, no other text:

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
- omit bundle/component rows with no price, such as rows whose price is "---"
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

  const modelResult = modelReceiptSchema.safeParse(parsedJson)
  if (!modelResult.success) {
    throw new ReceiptParseError("Failed to parse receipt data from image")
  }

  const parsedResult = parseReceiptResultSchema.safeParse(modelResult.data)
  if (!parsedResult.success) {
    throw new ReceiptParseError("Failed to parse receipt data from image")
  }

  if (parsedResult.data.items.length === 0) {
    throw new ReceiptParseError("Failed to parse receipt data from image")
  }

  return parsedResult.data
}

const modelReceiptItemSchema = z
  .object({
    name: z.string().trim().min(1),
    quantity: z.coerce.number().positive().catch(1),
    unitPrice: z.union([z.number(), z.string()]).nullable().optional(),
  })
  .transform(({ name, quantity, unitPrice }) => {
    const amount = parseReceiptAmount(unitPrice)
    return amount === null ? null : { name, quantity, unitPrice: amount }
  })

const modelReceiptSchema = z
  .object({
    items: z.array(modelReceiptItemSchema),
    tax: z.union([z.number(), z.string()]).optional(),
    serviceCharge: z.union([z.number(), z.string()]).optional(),
  })
  .transform(({ items, tax, serviceCharge }): ParseReceiptResult => {
    const chargedItems: ParseReceiptResult["items"] = []
    for (const item of items) {
      if (item) chargedItems.push(item)
    }

    return {
      items: chargedItems,
      tax: parseReceiptAmount(tax) ?? 0,
      serviceCharge: parseReceiptAmount(serviceCharge) ?? 0,
    }
  })

function parseReceiptAmount(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0
      ? Math.round(value * 100) / 100
      : null
  }

  if (!value) {
    return null
  }

  let normalized = value.trim().replace(/[^\d.,-]/g, "")
  if (!normalized || normalized === "-") {
    return null
  }

  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "")
  } else if (!normalized.includes(".") && /^-?\d+,\d+$/.test(normalized)) {
    normalized = normalized.replace(",", ".")
  } else {
    normalized = normalized.replace(/,/g, "")
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) {
    return null
  }

  return Math.round(amount * 100) / 100
}
