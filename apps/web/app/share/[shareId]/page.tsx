"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@workspace/ui/components/combobox"
import { Separator } from "@workspace/ui/components/separator"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>()
  const data = useQuery(api.bills.getSharePageData, { shareId })
  const toggleClaim = useMutation(api.claims.toggle)

  const [showBreakdown, setShowBreakdown] = useState(false)

  if (data === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Bill not found</p>
      </div>
    )
  }

  const { bill, lineItems, friends, claims, receiptUrl } = data

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const extras = bill.tax + bill.serviceCharge
  const total = subtotal + extras

  const claimsByItem = new Map<string, string[]>()
  for (const claim of claims) {
    const key = `${claim.lineItemId}:${claim.unitIndex}`
    if (!claimsByItem.has(key)) claimsByItem.set(key, [])
    claimsByItem.get(key)!.push(claim.friendId)
  }

  const friendTotals = new Map<
    string,
    {
      name: string
      items: { name: string; amount: number }[]
      subtotal: number
    }
  >()
  for (const friend of friends) {
    friendTotals.set(friend._id, { name: friend.name, items: [], subtotal: 0 })
  }
  for (const item of lineItems) {
    for (let unit = 0; unit < item.quantity; unit++) {
      const claimers = claimsByItem.get(`${item._id}:${unit}`) ?? []
      if (claimers.length === 0) continue
      const perPerson = item.unitPrice / claimers.length
      for (const friendId of claimers) {
        const entry = friendTotals.get(friendId)
        if (entry) {
          entry.items.push({ name: item.name, amount: perPerson })
          entry.subtotal += perPerson
        }
      }
    }
  }

  const claimedSubtotal = Array.from(friendTotals.values()).reduce(
    (sum, f) => sum + f.subtotal,
    0
  )
  const unclaimed = subtotal - claimedSubtotal
  const splits = Array.from(friendTotals.entries()).map(([id, data]) => {
    const proportion = subtotal > 0 ? data.subtotal / subtotal : 0
    const extraShare = extras * proportion
    return {
      id,
      name: data.name,
      items: data.items,
      subtotal: data.subtotal,
      extras: extraShare,
      total: data.subtotal + extraShare,
    }
  })

  const expandedItems = lineItems.flatMap((item) =>
    Array.from({ length: item.quantity }, (_, i) => ({
      ...item,
      unitIndex: i,
      displayPrice: item.unitPrice,
    }))
  )

  const handleClaimChange = (
    newNames: string[],
    currentClaimerIds: string[],
    lineItemId: Id<"lineItems">,
    unitIndex: number
  ) => {
    const currentNames = currentClaimerIds
      .map((id) => friends.find((f) => f._id === id)?.name ?? "")
      .filter(Boolean)
    const added = newNames.find((name) => !currentNames.includes(name))
    const removed = currentNames.find((name) => !newNames.includes(name))
    const changedName = added ?? removed
    if (!changedName) return
    const friendId = friends.find((f) => f.name === changedName)?._id
    if (!friendId) return
    toggleClaim({ billId: bill._id, friendId, lineItemId, unitIndex })
  }

  return (
    <div className="mx-auto max-w-2xl p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="w-full text-center text-xl font-semibold">
          {bill.name}
        </h1>
      </div>

      {/* Receipt + Split Summary */}
      <Card className="mb-4">
        <CardContent className="space-y-3 py-4">
          {receiptUrl && (
            <Dialog>
              <div className="relative h-40 w-full overflow-hidden rounded-lg">
                <Image
                  src={receiptUrl}
                  alt="Receipt"
                  fill
                  className="object-cover"
                />
              </div>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  View full receipt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogTitle className="sr-only">Receipt</DialogTitle>
                <Image
                  src={receiptUrl}
                  alt="Receipt"
                  width={600}
                  height={800}
                  className="w-full"
                />
              </DialogContent>
            </Dialog>
          )}

          <div className="mt-4 flex justify-between">
            <div className="text-lg font-bold">Summary</div>
            {splits.some((s) => s.total > 0) && (
              <button
                className="flex items-center gap-1 text-sm font-medium text-primary dark:text-purple-400"
                onClick={() => setShowBreakdown(!showBreakdown)}
              >
                {showBreakdown ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {showBreakdown ? "Hide breakdown" : "Show breakdown"}
              </button>
            )}
          </div>
          {splits
            .filter((s) => s.total > 0)
            .map((split) => (
              <div key={split.id}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{split.name}</span>
                  <span className="font-semibold">
                    ${split.total.toFixed(2)}
                  </span>
                </div>
                {showBreakdown && (
                  <div className="mt-1 mb-2 ml-2 space-y-0.5">
                    {split.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>{item.name}</span>
                        <span>${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tax & svc charge</span>
                      <span>${split.extras.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

          {splits.every((s) => s.total === 0) && (
            <p className="text-center text-sm text-muted-foreground">
              No items claimed yet.
            </p>
          )}

          <Separator />

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bill total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          {unclaimed > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Unaccounted</span>
              <span>${unclaimed.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tagging */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Split bill</CardTitle>
          <p className="text-xs text-muted-foreground">
            Tag everyone to what they had
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {expandedItems.map((item) => {
            const claimKey = `${item._id}:${item.unitIndex}`
            const claimerIds = claimsByItem.get(claimKey) ?? []

            return (
              <div key={`${item._id}-${item.unitIndex}`}>
                <div className="space-y-1.5 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm">
                      ${item.displayPrice.toFixed(2)}
                    </span>
                  </div>
                  <Combobox
                    items={friends.map((f) => f.name)}
                    multiple
                    value={claimerIds.map(
                      (id) => friends.find((f) => f._id === id)?.name ?? ""
                    )}
                    onValueChange={(names: string[]) => {
                      handleClaimChange(
                        names,
                        claimerIds,
                        item._id,
                        item.unitIndex
                      )
                    }}
                  >
                    <ComboboxChips className="mt-2 min-h-8 text-xs">
                      <ComboboxValue>
                        {claimerIds.map((id) => {
                          const name =
                            friends.find((f) => f._id === id)?.name ?? ""
                          return <ComboboxChip key={id}>{name}</ComboboxChip>
                        })}
                      </ComboboxValue>
                      <ComboboxChipsInput placeholder="Add people..." />
                    </ComboboxChips>
                    <ComboboxContent>
                      <ComboboxEmpty>No one found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
