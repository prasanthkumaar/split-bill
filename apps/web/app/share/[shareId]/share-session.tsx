"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
import { ShareHeader } from "./_components/share-header"
import { ShareReceiptCard } from "./_components/share-receipt-card"
import { SplitList } from "./_components/split-list"
import { ItemSplitDialog } from "./_components/item-split-dialog"

type ShareSessionProps = {
  shareId: string
}

type DrawerItem = {
  lineItemId: Id<"lineItems">
  unitIndex: number
  name: string
  price: number
} | null

export function ShareSession({ shareId }: ShareSessionProps) {
  const data = useQuery(api.sharing.getShareSession, { shareId })
  const setClaimers = useMutation(api.sharing.setClaimers)

  const [showBreakdown, setShowBreakdown] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerItem, setDrawerItem] = useState<DrawerItem>(null)
  const [drawerSelection, setDrawerSelection] = useState<Id<"friends">[]>([])

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

  const claimsByItem = new Map<string, Id<"friends">[]>()
  for (const claim of claims) {
    const key = `${claim.lineItemId}:${claim.unitIndex}`
    if (!claimsByItem.has(key)) {
      claimsByItem.set(key, [])
    }
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
    friendTotals.set(friend._id, {
      name: friend.name,
      items: [],
      subtotal: 0,
    })
  }

  for (const item of lineItems) {
    for (let unit = 0; unit < item.quantity; unit += 1) {
      const claimers = claimsByItem.get(`${item._id}:${unit}`) ?? []
      if (claimers.length === 0) {
        continue
      }

      const perPerson = item.unitPrice / claimers.length
      for (const friendId of claimers) {
        const entry = friendTotals.get(friendId)
        if (!entry) {
          continue
        }

        entry.items.push({ name: item.name, amount: perPerson })
        entry.subtotal += perPerson
      }
    }
  }

  const claimedSubtotal = Array.from(friendTotals.values()).reduce(
    (sum, friendTotal) => sum + friendTotal.subtotal,
    0
  )
  const assignedExtras = subtotal > 0 ? extras * (claimedSubtotal / subtotal) : 0
  const unclaimed = subtotal - claimedSubtotal + (extras - assignedExtras)
  const splits = Array.from(friendTotals.entries()).map(([id, friendTotal]) => {
    const proportion = subtotal > 0 ? friendTotal.subtotal / subtotal : 0
    const extraShare = extras * proportion

    return {
      id,
      name: friendTotal.name,
      items: friendTotal.items,
      subtotal: friendTotal.subtotal,
      extras: extraShare,
      total: friendTotal.subtotal + extraShare,
    }
  })

  const expandedItems = lineItems.flatMap((item) =>
    Array.from({ length: item.quantity }, (_, unitIndex) => ({
      ...item,
      unitIndex,
      displayPrice: item.unitPrice,
    }))
  )

  const handleClaimChange = (
    newIds: Id<"friends">[],
    lineItemId: Id<"lineItems">,
    unitIndex: number
  ) => {
    void (async () => {
      try {
        await setClaimers({
          billId: bill._id,
          lineItemId,
          unitIndex,
          friendIds: newIds,
        })
      } catch (error) {
        console.error("Failed to update claim:", error)
      }
    })()
  }

  const openDrawer = (
    lineItemId: Id<"lineItems">,
    unitIndex: number,
    name: string,
    price: number,
    currentClaimerIds: Id<"friends">[]
  ) => {
    setDrawerItem({ lineItemId, unitIndex, name, price })
    setDrawerSelection([...currentClaimerIds])
    setDrawerOpen(true)
  }

  const saveDrawerSelection = () => {
    if (!drawerItem) {
      return
    }

    void (async () => {
      try {
        await setClaimers({
          billId: bill._id,
          lineItemId: drawerItem.lineItemId,
          unitIndex: drawerItem.unitIndex,
          friendIds: drawerSelection,
        })
        setDrawerOpen(false)
      } catch (error) {
        console.error("Failed to save split selection:", error)
      }
    })()
  }

  const toggleDrawerFriend = (friendId: Id<"friends">) => {
    setDrawerSelection((currentSelection) =>
      currentSelection.includes(friendId)
        ? currentSelection.filter((id) => id !== friendId)
        : [...currentSelection, friendId]
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-5 md:grid md:grid-cols-[2fr_3fr] md:gap-4">
      <div className="md:sticky md:top-5 md:max-h-[calc(100vh-2.5rem)] md:self-start md:overflow-y-auto">
        <ShareHeader name={bill.name} />
        <ShareReceiptCard
          receiptUrl={receiptUrl}
          splits={splits}
          showBreakdown={showBreakdown}
          onToggleBreakdown={() => setShowBreakdown((current) => !current)}
          total={total}
          unclaimed={unclaimed}
        />
      </div>

      <SplitList
        expandedItems={expandedItems}
        claimsByItem={claimsByItem}
        friends={friends}
        isDesktop={isDesktop}
        onClaimIdsChange={handleClaimChange}
        onOpenItemSplit={openDrawer}
      />

      <ItemSplitDialog
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={drawerItem}
        friends={friends}
        selectedFriendIds={drawerSelection}
        onToggleFriend={toggleDrawerFriend}
        onSave={saveDrawerSelection}
      />
    </div>
  )
}
