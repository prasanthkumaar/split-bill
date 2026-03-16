import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { env } from "@/env"
import {
  parseReceiptRequestSchema,
  parseReceiptResponseSchema,
} from "./schema"

export async function POST(req: NextRequest) {
  try {
    const body = parseReceiptRequestSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Invalid request", details: z.flattenError(body.error) },
        { status: 400 }
      )
    }

    const { imageBase64, mimeType } = body.data

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

    const parsed = parseReceiptResponseSchema.safeParse(
      JSON.parse(result.text)
    )
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Failed to parse receipt data from image" },
        { status: 422 }
      )
    }

    return NextResponse.json(parsed.data)
  } catch (error) {
    console.error("parse-receipt error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
