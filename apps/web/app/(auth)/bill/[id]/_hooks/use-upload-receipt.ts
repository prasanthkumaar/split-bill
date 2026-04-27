import { useMutation as useConvexMutation } from "convex/react"
import { useMutation } from "@tanstack/react-query"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { ParseReceiptResult } from "../schema"

const SUPPORTED_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])
const NORMALIZED_RECEIPT_MIME_TYPE = "image/jpeg"
const MAX_RECEIPT_DIMENSION = 2048
const JPEG_QUALITY = 0.85

export function useUploadReceipt(billId: Id<"bills">) {
  const generateUploadUrl = useConvexMutation(api.bills.generateUploadUrl)
  const updateBill = useConvexMutation(api.bills.update)
  const replaceAllItems = useConvexMutation(api.lineItems.replaceAll)

  return useMutation({
    mutationFn: async (file: File) => {
      const normalizedFile = await normalizeReceiptFile(file)
      const uploadUrl = await generateUploadUrl()
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": normalizedFile.type },
        body: normalizedFile,
      })
      const { storageId } = await res.json()
      await updateBill({ id: billId, imageId: storageId })

      const imageBase64 = await toBase64(normalizedFile)
      const parsed = await requestReceiptParse(imageBase64, normalizedFile.type)

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

async function normalizeReceiptFile(file: File): Promise<File> {
  if (SUPPORTED_RECEIPT_MIME_TYPES.has(file.type)) {
    return file
  }

  const image = await loadImage(file)
  const { width, height } = getNormalizedDimensions(
    image.naturalWidth,
    image.naturalHeight
  )
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Failed to prepare receipt image")
  }

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const blob = await canvasToBlob(
    canvas,
    NORMALIZED_RECEIPT_MIME_TYPE,
    JPEG_QUALITY
  )

  return new File([blob], toJpegFilename(file.name), {
    type: NORMALIZED_RECEIPT_MIME_TYPE,
    lastModified: file.lastModified,
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Failed to read receipt image"))
    }
    image.src = objectUrl
  })
}

function getNormalizedDimensions(width: number, height: number) {
  const longestSide = Math.max(width, height)
  if (longestSide <= MAX_RECEIPT_DIMENSION) {
    return { width, height }
  }

  const scale = MAX_RECEIPT_DIMENSION / longestSide
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to convert receipt image"))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality
    )
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

  return res.json()
}
