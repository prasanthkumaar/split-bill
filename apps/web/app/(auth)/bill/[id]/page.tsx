"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Doc, Id } from "@convex/_generated/dataModel"
import { useUploadReceipt } from "./_hooks/use-upload-receipt"
import { BillHeader } from "./_components/bill-header"
import { ReceiptCard } from "./_components/receipt-card"
import { LineItemsCard } from "./_components/line-items-card"
import { TotalsCard } from "./_components/totals-card"
import { FriendsCard } from "./_components/friends-card"
import { ShareCard } from "./_components/share-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

export default function BillPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const billId = id as Id<"bills">

  const bill = useQuery(api.bills.getWithImage, { id: billId })
  const lineItems = useQuery(api.lineItems.list, { billId })
  const friends = useQuery(api.friends.list, { billId })
  const claims = useQuery(api.claims.list, { billId })

  const updateBill = useMutation(api.bills.update)
  const addItem = useMutation(api.lineItems.add)
  const updateItem = useMutation(api.lineItems.update)
  const removeItem = useMutation(api.lineItems.remove)
  const addFriend = useMutation(api.friends.add)
  const removeFriend = useMutation(api.friends.remove)
  const {
    mutate: uploadReceipt,
    isPending: uploading,
    error: uploadError,
  } = useUploadReceipt(billId)

  const [copied, setCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "friend" | "lineItem"
    id: Id<"friends"> | Id<"lineItems">
    name: string
    claimCount: number
  } | null>(null)

  const claimsByFriend = useMemo(() => {
    const map = new Map<string, number>()
    if (!claims) return map
    for (const c of claims) {
      map.set(c.friendId, (map.get(c.friendId) ?? 0) + 1)
    }
    return map
  }, [claims])

  const claimsByItem = useMemo(() => {
    const map = new Map<string, number>()
    if (!claims) return map
    for (const c of claims) {
      map.set(c.lineItemId, (map.get(c.lineItemId) ?? 0) + 1)
    }
    return map
  }, [claims])

  if (!bill) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const subtotal =
    lineItems?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ??
    0
  const total = subtotal + bill.tax + bill.serviceCharge

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${bill.shareId}`
      : ""

  const handleAddItem = async ({
    name,
    quantity,
    unitPrice,
  }: {
    name: string
    quantity: number
    unitPrice: number
  }) => {
    await addItem({
      billId,
      name,
      quantity,
      unitPrice,
    })
  }

  const handleAddFriend = async (name: string) => {
    await addFriend({ billId, name })
  }

  const handleShare = async () => {
    await updateBill({ id: billId, status: "shared" })
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy share URL after sharing:", error)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy share URL:", error)
    }
  }

  const handleDeleteItem = (item: Doc<"lineItems">, claimCount: number) => {
    if (claimCount > 0) {
      setDeleteConfirm({
        type: "lineItem",
        id: item._id,
        name: item.name,
        claimCount,
      })
      return
    }

    removeItem({ id: item._id })
  }

  const handleDeleteFriend = (friend: Doc<"friends">, claimCount: number) => {
    if (claimCount > 0) {
      setDeleteConfirm({
        type: "friend",
        id: friend._id,
        name: friend.name,
        claimCount,
      })
      return
    }

    removeFriend({ id: friend._id })
  }

  const deleteDescription = !deleteConfirm
    ? ""
    : deleteConfirm.type === "friend"
      ? `${deleteConfirm.name} has claimed ${deleteConfirm.claimCount} item${deleteConfirm.claimCount === 1 ? "" : "s"}. Their claims will be removed and splits will change.`
      : `${deleteConfirm.claimCount} person${deleteConfirm.claimCount === 1 ? " has" : "s have"} claimed this item. Their claims will be removed and splits will change.`

  const uploadErrorMessage =
    uploadError instanceof Error ? uploadError.message : undefined
  const receiptUploadError =
    uploadErrorMessage === "Failed to parse receipt"
      ? "Unable to parse receipt. Try re-uploading a clearer photo."
      : uploadErrorMessage
        ? "Failed to upload receipt. Please try again."
        : undefined

  return (
    <div className="mx-auto max-w-2xl p-6">
      <BillHeader
        name={bill.name}
        status={bill.status}
        onBack={() => router.push("/")}
      />

      <ReceiptCard
        receiptUrl={bill.receiptUrl}
        uploading={uploading}
        uploadError={receiptUploadError}
        onUploadReceipt={(file) => uploadReceipt(file)}
      />

      <LineItemsCard
        lineItems={lineItems}
        claimsByItem={claimsByItem}
        onAddItem={handleAddItem}
        onUpdateItem={updateItem}
        onDeleteItem={handleDeleteItem}
      />

      <TotalsCard
        tax={bill.tax}
        serviceCharge={bill.serviceCharge}
        subtotal={subtotal}
        total={total}
        onTaxBlur={(tax) => updateBill({ id: billId, tax })}
        onServiceChargeBlur={(serviceCharge) =>
          updateBill({ id: billId, serviceCharge })
        }
      />

      <FriendsCard
        friends={friends}
        claimsByFriend={claimsByFriend}
        onAddFriend={handleAddFriend}
        onDeleteFriend={handleDeleteFriend}
      />

      <ShareCard
        status={bill.status}
        shareUrl={shareUrl}
        copied={copied}
        hasFriends={Boolean(friends?.length)}
        hasLineItems={Boolean(lineItems?.length)}
        onShare={handleShare}
        onCopy={handleCopy}
        onViewSplit={() => router.push(`/share/${bill.shareId}`)}
      />

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteConfirm?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm) return
                if (deleteConfirm.type === "friend") {
                  removeFriend({ id: deleteConfirm.id as Id<"friends"> })
                } else {
                  removeItem({ id: deleteConfirm.id as Id<"lineItems"> })
                }
                setDeleteConfirm(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
