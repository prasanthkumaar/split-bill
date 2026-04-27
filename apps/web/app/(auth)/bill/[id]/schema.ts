import { z } from "zod"

const receiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
})

export const parseReceiptInputSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
})

export const parseReceiptResultSchema = z.object({
  items: z.array(receiptItemSchema),
  tax: z.number().nonnegative().default(0),
  serviceCharge: z.number().nonnegative().default(0),
})

export type ParseReceiptInput = z.infer<typeof parseReceiptInputSchema>
export type ParseReceiptResult = z.infer<typeof parseReceiptResultSchema>
