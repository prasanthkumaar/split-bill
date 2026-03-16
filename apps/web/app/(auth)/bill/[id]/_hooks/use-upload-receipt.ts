import { useMutation as useConvexMutation } from "convex/react"
import { useMutation } from "@tanstack/react-query"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { ParseReceiptResponse } from "@/app/api/parse-receipt/schema"

export function useUploadReceipt(billId: Id<"bills">) {
  const generateUploadUrl = useConvexMutation(api.bills.generateUploadUrl)
  const updateBill = useConvexMutation(api.bills.update)
  const replaceAllItems = useConvexMutation(api.lineItems.replaceAll)

  return useMutation({
    mutationFn: async (file: File) => {
      const uploadUrl = await generateUploadUrl()
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await res.json()
      await updateBill({ id: billId, imageId: storageId })

      const imageBase64 = await toBase64(file)
      const parsed = await parseReceipt(imageBase64, file.type)

      if (parsed.items?.length) {
        await replaceAllItems({ billId, items: parsed.items })
      }
      if (parsed.tax || parsed.serviceCharge) {
        await updateBill({
          id: billId,
          tax: parsed.tax ?? 0,
          serviceCharge: parsed.serviceCharge ?? 0,
        })
      }
    },
  })
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1]!)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function parseReceipt(
  imageBase64: string,
  mimeType: string
): Promise<ParseReceiptResponse> {
  const res = await fetch("/api/parse-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  })
  if (!res.ok) throw new Error("Failed to parse receipt")
  return res.json()
}
