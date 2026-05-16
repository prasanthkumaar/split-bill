import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { parseReceipt, ReceiptParseError } from "@/app/(auth)/bill/[id]/actions"
import { parseReceiptInputSchema } from "@/app/(auth)/bill/[id]/schema"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = parseReceiptInputSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json(
        { error: "Invalid request", details: z.flattenError(body.error) },
        { status: 400 }
      )
    }

    try {
      const parsed = await parseReceipt(body.data)
      return NextResponse.json(parsed)
    } catch (error) {
      if (error instanceof ReceiptParseError || error instanceof z.ZodError) {
        return NextResponse.json({ error: error.message }, { status: 422 })
      }

      throw error
    }
  } catch (error) {
    console.error("parse-receipt error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
