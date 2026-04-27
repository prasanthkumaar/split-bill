import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { parseReceipt } from "@/app/(auth)/bill/[id]/actions"
import { parseReceiptInputSchema } from "@/app/(auth)/bill/[id]/schema"

export async function POST(req: NextRequest) {
  try {
    const body = parseReceiptInputSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Invalid request", details: z.flattenError(body.error) },
        { status: 400 }
      )
    }

    const parsed = await parseReceipt(body.data)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error("parse-receipt error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
