import { useMutation } from "@tanstack/react-query"
import type {
  ParseReceiptRequest,
  ParseReceiptResponse,
} from "@/app/api/parse-receipt/schema"

async function parseReceipt(
  data: ParseReceiptRequest
): Promise<ParseReceiptResponse> {
  const res = await fetch("/api/parse-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to parse receipt")
  return res.json()
}

export function useParseReceipt() {
  return useMutation({
    mutationFn: parseReceipt,
  })
}
