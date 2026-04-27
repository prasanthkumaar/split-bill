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
  const data = useQuery(api.bills.getSharePageData, { shareId })
  const toggleClaim = useMutation(api.claims.toggle)
  const setClaimers = useMutation(api.claims.setClaimers)

  const [showBreakdown, setShowBreakdown] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerItem, setDrawerItem] = useState<DrawerItem>(null)
  const [drawerSelection, setDrawerSelection] = useState<string[]>([])

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
  const unclaimed = subtotal - claimedSubtotal
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
    newNames: string[],
    currentClaimerIds: string[],
    lineItemId: Id<"lineItems">,
    unitIndex: number
  ) => {
    const currentNames = currentClaimerIds
      .map((friendId) => friends.find((friend) => friend._id === friendId)?.name ?? "")
      .filter(Boolean)

    const added = newNames.find((name) => !currentNames.includes(name))
    const removed = currentNames.find((name) => !newNames.includes(name))
    const changedName = added ?? removed

    if (!changedName) {
      return
    }

    const friendId = friends.find((friend) => friend.name === changedName)?._id
    if (!friendId) {
      return
    }

    toggleClaim({ billId: bill._id, friendId, lineItemId, unitIndex })
  }

  const openDrawer = (
    lineItemId: Id<"lineItems">,
    unitIndex: number,
    name: string,
    price: number,
    currentClaimerIds: string[]
  ) => {
    setDrawerItem({ lineItemId, unitIndex, name, price })
    setDrawerSelection([...currentClaimerIds])
    setDrawerOpen(true)
  }

  const saveDrawerSelection = () => {
    if (!drawerItem) {
      return
    }

    setClaimers({
      billId: bill._id,
      lineItemId: drawerItem.lineItemId,
      unitIndex: drawerItem.unitIndex,
      friendIds: drawerSelection as Id<"friends">[],
    })
    setDrawerOpen(false)
  }

  const toggleDrawerFriend = (friendId: string) => {
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
        onClaimNamesChange={handleClaimChange}
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
