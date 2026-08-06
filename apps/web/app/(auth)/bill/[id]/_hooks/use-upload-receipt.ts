import { useMutation as useConvexMutation } from "convex/react"
import { useMutation } from "@tanstack/react-query"
import imageCompression from "browser-image-compression"
import { toast } from "sonner"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { parseReceiptResultSchema, type ParseReceiptResult } from "../schema"

const NORMALIZED_RECEIPT_MIME_TYPE = "image/jpeg"
const MAX_PREPARED_RECEIPT_BYTES = 3_000_000
const MAX_RECEIPT_DIMENSION = 2048
const JPEG_QUALITY = 0.85
const RECEIPT_PROCESSING_ERROR_MESSAGE =
  "Couldn’t process this receipt. Please upload it again."

export function useUploadReceipt(billId: Id<"bills">) {
  const generateUploadUrl = useConvexMutation(api.bills.generateUploadUrl)
  const updateBill = useConvexMutation(api.bills.update)
  const replaceAllItems = useConvexMutation(api.lineItems.replaceAll)

  return useMutation({
    mutationFn: async (file: File) => {
      const preparedFile = await prepareReceiptFile(file)
      const uploadUrl = await generateUploadUrl()
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": preparedFile.type },
        body: preparedFile,
      })
      const { storageId } = await res.json()
      await updateBill({ id: billId, imageId: storageId })

      const imageBase64 = await toBase64(preparedFile)
      const parsed = await requestReceiptParse(imageBase64, preparedFile.type)

      if (parsed.items.length) {
        await replaceAllItems({ billId, items: parsed.items })
      }
      if (parsed.tax || parsed.serviceCharge) {
        await updateBill({
          id: billId,
          tax: parsed.tax,
          serviceCharge: parsed.serviceCharge,
        })
      }
    },
    onError: () => {
      toast.error(RECEIPT_PROCESSING_ERROR_MESSAGE)
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

async function prepareReceiptFile(file: File): Promise<File> {
  const compressionInputFile = ensureImageMimeType(file)
  const compressedFile = await imageCompression(compressionInputFile, {
    maxSizeMB: MAX_PREPARED_RECEIPT_BYTES / (1024 * 1024),
    maxWidthOrHeight: MAX_RECEIPT_DIMENSION,
    fileType: NORMALIZED_RECEIPT_MIME_TYPE,
    initialQuality: JPEG_QUALITY,
    useWebWorker: true,
  })

  if (compressedFile.size > MAX_PREPARED_RECEIPT_BYTES) {
    throw new Error("Could not reduce the receipt image enough")
  }

  return new File([compressedFile], toJpegFilename(file.name), {
    type: NORMALIZED_RECEIPT_MIME_TYPE,
    lastModified: file.lastModified,
  })
}

function ensureImageMimeType(file: File): File {
  if (file.type.startsWith("image/")) {
    return file
  }

  return new File([file], file.name, {
    type: NORMALIZED_RECEIPT_MIME_TYPE,
    lastModified: file.lastModified,
  })
}

function toJpegFilename(fileName: string) {
  const trimmedFileName = fileName.trim()
  if (!trimmedFileName) {
    return "receipt.jpg"
  }

  return trimmedFileName.replace(/\.[^.]+$/, "") + ".jpg"
}

async function requestReceiptParse(
  imageBase64: string,
  mimeType: string
): Promise<ParseReceiptResult> {
  const res = await fetch("/api/parse-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  })

  if (!res.ok) {
    throw new Error("Failed to parse receipt")
  }

  const data = await res.json()
  return parseReceiptResultSchema.parse(data)
}
