import { useRef } from "react"
import Image from "next/image"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Loader2, Upload } from "lucide-react"

const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])
const MAX_RECEIPT_UPLOAD_BYTES = 10 * 1024 * 1024

type ReceiptCardProps = {
  receiptUrl?: string | null
  uploading: boolean
  onUploadReceipt: (file: File) => void
}

export function ReceiptCard({
  receiptUrl,
  uploading,
  onUploadReceipt,
}: ReceiptCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card className="mb-4">
      <CardContent className="py-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              if (
                !ALLOWED_RECEIPT_MIME_TYPES.has(file.type) ||
                file.size > MAX_RECEIPT_UPLOAD_BYTES
              ) {
                event.target.value = ""
                return
              }

              onUploadReceipt(file)
            }
            event.target.value = ""
          }}
        />
        {uploading ? (
          <div className="mb-3 flex aspect-3/4 w-full items-center justify-center rounded-md border bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          receiptUrl && (
            <div className="relative mb-3 aspect-3/4 w-full">
              <Image
                src={receiptUrl}
                alt="Receipt"
                fill
                className="rounded-md border object-contain"
              />
            </div>
          )
        )}
        <Button
          variant="outline"
          size={receiptUrl ? "sm" : "default"}
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing receipt...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {receiptUrl ? "Re-upload receipt" : "Upload receipt photo"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
