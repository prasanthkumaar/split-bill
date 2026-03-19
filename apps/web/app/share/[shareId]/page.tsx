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
  CardDescription,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
import { useState } from "react"
import Image from "next/image"
import { ChevronDown, ChevronUp } from "lucide-react"

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>()
  const data = useQuery(api.bills.getSharePageData, { shareId })
  const toggleClaim = useMutation(api.claims.toggle)

  const [selectedFriend, setSelectedFriend] = useState<Id<"friends"> | null>(
    null
  )
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

  const hasClaimed = (
    friendId: Id<"friends">,
    lineItemId: Id<"lineItems">,
    unitIndex: number
  ) => {
    const claimers = claimsByItem.get(`${lineItemId}:${unitIndex}`) ?? []
    return claimers.includes(friendId)
  }

  const handleToggle = async (
    lineItemId: Id<"lineItems">,
    unitIndex: number
  ) => {
    if (!selectedFriend) return
    await toggleClaim({
      billId: bill._id,
      friendId: selectedFriend,
      lineItemId,
      unitIndex,
    })
  }

  const handleOthersChange = (
    newValue: string[],
    currentOthers: string[],
    lineItemId: Id<"lineItems">,
    unitIndex: number
  ) => {
    const added = newValue.find((id) => !currentOthers.includes(id))
    const removed = currentOthers.find((id) => !newValue.includes(id))
    const friendId = (added ?? removed) as Id<"friends"> | undefined
    if (!friendId) return
    toggleClaim({ billId: bill._id, friendId, lineItemId, unitIndex })
  }

  const selectedFriendName = friends.find((f) => f._id === selectedFriend)?.name

  const otherFriends = friends.filter((f) => f._id !== selectedFriend)

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{bill.name}</h1>
        <p className="text-sm text-muted-foreground">
          Select your name, then tick what you had.
        </p>
      </div>

      {receiptUrl && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="relative aspect-3/4 w-full">
              <Image
                src={receiptUrl}
                alt="Receipt"
                fill
                className="rounded-md border object-contain"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Who are you?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {friends.map((friend) => (
            <Button
              key={friend._id}
              variant={selectedFriend === friend._id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFriend(friend._id)}
            >
              {friend.name}
            </Button>
          ))}
        </CardContent>
      </Card>

      {selectedFriend && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">
              What did you have, {selectedFriendName}?
            </CardTitle>
            <CardDescription>
              Tick what you had. Know what others ordered? Tag them below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expandedItems.map((item) => {
              const checked = hasClaimed(
                selectedFriend,
                item._id,
                item.unitIndex
              )
              const claimKey = `${item._id}:${item.unitIndex}`
              const claimers = claimsByItem.get(claimKey) ?? []
              const otherClaimerIds = claimers.filter(
                (id) => id !== selectedFriend
              )

              return (
                <div
                  key={`${item._id}-${item.unitIndex}`}
                  className="space-y-1.5"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        handleToggle(item._id, item.unitIndex)
                      }
                      className="mt-0.5"
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm">
                        ${item.displayPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="pl-7">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Shared with
                    </label>
                    <Combobox
                      items={otherFriends.map((f) => f.name)}
                      multiple
                      value={otherClaimerIds.map(
                        (id) =>
                          friends.find((f) => f._id === id)?.name ?? ""
                      )}
                      onValueChange={(names: string[]) => {
                        const newIds = names
                          .map(
                            (name) =>
                              otherFriends.find((f) => f.name === name)?._id
                          )
                          .filter(Boolean) as string[]
                        handleOthersChange(
                          newIds,
                          otherClaimerIds,
                          item._id,
                          item.unitIndex
                        )
                      }}
                    >
                      <ComboboxChips className="min-h-8 text-xs">
                        <ComboboxValue>
                          {otherClaimerIds.map((id) => {
                            const name =
                              friends.find((f) => f._id === id)?.name ?? ""
                            return (
                              <ComboboxChip key={id}>{name}</ComboboxChip>
                            )
                          })}
                        </ComboboxValue>
                        <ComboboxChipsInput placeholder="Add others..." />
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
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Split Summary</CardTitle>
            {splits.some((s) => s.total > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBreakdown(!showBreakdown)}
              >
                {showBreakdown ? (
                  <ChevronUp className="mr-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-1 h-4 w-4" />
                )}
                {showBreakdown ? "Hide" : "Show"} breakdown
              </Button>
            )}
          </div>
          <CardDescription>
            Tax & service charge split proportionally
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
    </div>
  )
}
