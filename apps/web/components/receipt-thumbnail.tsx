"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import Image from "next/image"
import { Receipt } from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"

export function ReceiptThumbnail({ imageId }: { imageId?: Id<"_storage"> }) {
  const url = useQuery(
    api.bills.getImageUrl,
    imageId ? { storageId: imageId } : "skip"
  )

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
      {url ? (
        <Image src={url} alt="Receipt" fill className="object-cover" />
      ) : (
        <Receipt className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  )
}
