import { z } from "zod"

const receiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
})

export const parseReceiptRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
})

export const parseReceiptResponseSchema = z.object({
  items: z.array(receiptItemSchema),
  tax: z.number().nonnegative().default(0),
  serviceCharge: z.number().nonnegative().default(0),
})

export type ParseReceiptRequest = z.infer<typeof parseReceiptRequestSchema>
export type ParseReceiptResponse = z.infer<typeof parseReceiptResponseSchema>
