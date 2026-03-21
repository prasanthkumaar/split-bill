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
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { Eye, EyeOff, XIcon } from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>()
  const data = useQuery(api.bills.getSharePageData, { shareId })
  const toggleClaim = useMutation(api.claims.toggle)
  const setClaimers = useMutation(api.claims.setClaimers)

  const [showBreakdown, setShowBreakdown] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Drawer state for mobile
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerItem, setDrawerItem] = useState<{
    lineItemId: Id<"lineItems">
    unitIndex: number
    name: string
    price: number
  } | null>(null)
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

  // Desktop: immediate save per change (used by combobox popover)
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

  // Mobile: open drawer with current selection
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

  // Mobile: save drawer selection
  const saveDrawerSelection = () => {
    if (!drawerItem) return
    const friendIds = drawerSelection as Id<"friends">[]
    setClaimers({
      billId: bill._id,
      lineItemId: drawerItem.lineItemId,
      unitIndex: drawerItem.unitIndex,
      friendIds,
    })
    setDrawerOpen(false)
  }

  const toggleDrawerFriend = (friendId: string) => {
    setDrawerSelection((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-5 md:grid md:grid-cols-[2fr_3fr] md:gap-4">
      <div className="md:sticky md:top-5 md:self-start md:max-h-[calc(100vh-2.5rem)] md:overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="w-full text-center text-xl font-semibold md:text-left">
            {bill.name}
          </h1>
        </div>

        {/* Receipt + Split Summary */}
        <Card className="mb-4 pt-0 md:bg-transparent md:ring-0 md:shadow-none md:border-none">
        <CardContent className="space-y-3 py-4 md:px-0 md:py-0 md:pr-4">
          {receiptUrl && (
            <Dialog>
              <div className="relative h-40 w-full overflow-hidden rounded-lg md:h-72">
                <Image
                  src={receiptUrl}
                  alt="Receipt"
                  fill
                  className="object-cover"
                />
              </div>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="w-full">
                  View full receipt
                </Button>
              </DialogTrigger>
              <DialogContent showCloseButton={false} className="w-[95vw]! sm:w-fit! max-w-[95vw]! p-0! gap-0! rounded-2xl! overflow-hidden">
                <DialogTitle className="sr-only">Receipt</DialogTitle>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="absolute top-2 right-2 z-10 rounded-full bg-background/80 backdrop-blur-sm"
                  >
                    <XIcon />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
                <Image
                  src={receiptUrl}
                  alt="Receipt"
                  width={600}
                  height={800}
                  className="max-h-[95vh] w-full sm:w-auto"
                />
              </DialogContent>
            </Dialog>
          )}

          <div className="mt-4 flex justify-between">
            <div className="text-lg font-bold">Summary</div>
            {splits.some((s) => s.total > 0) && (
              <button
                className="flex items-center gap-1 text-sm font-medium text-primary dark:text-indigo-200"
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

      </div>

      {/* Tagging */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Split bill</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tag everyone to what they had
          </p>
        </CardHeader>
        <CardContent className="mt-1 space-y-3">
          {expandedItems.map((item) => {
            const claimKey = `${item._id}:${item.unitIndex}`
            const claimerIds = claimsByItem.get(claimKey) ?? []

            return (
              <div key={`${item._id}-${item.unitIndex}`}>
                <div className="space-y-1 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{item.name}</span>
                    <span className="text-sm font-medium">
                      ${item.displayPrice.toFixed(2)}
                    </span>
                  </div>

                  {isDesktop ? (
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
                      <ComboboxChips className="mt-2 min-h-9 text-xs">
                        <ComboboxValue>
                          {claimerIds.map((id) => {
                            const name =
                              friends.find((f) => f._id === id)?.name ?? ""
                            return <ComboboxChip key={id}>{name}</ComboboxChip>
                          })}
                        </ComboboxValue>
                        <ComboboxChipsInput
                          placeholder={
                            claimerIds.length > 0 ? "" : "Add people..."
                          }
                        />
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
                  ) : (
                    <button
                      type="button"
                      className="mt-2 flex min-h-9 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-sm transition-colors dark:bg-input/30"
                      onClick={() =>
                        openDrawer(
                          item._id,
                          item.unitIndex,
                          item.name,
                          item.displayPrice,
                          claimerIds
                        )
                      }
                    >
                      {claimerIds.length > 0 ? (
                        claimerIds.map((id) => {
                          const name =
                            friends.find((f) => f._id === id)?.name ?? ""
                          return (
                            <span
                              key={id}
                              className="flex h-6 items-center rounded-sm bg-muted px-2 text-sm font-medium dark:bg-indigo-400/20"
                            >
                              {name}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-muted-foreground">
                          Add people...
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Mobile Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent aria-describedby={undefined}>
          <DrawerHeader className="pb-6">
            <DrawerTitle className="text-lg">
              {drawerItem?.name}
            </DrawerTitle>
            <p className="text-sm text-muted-foreground">
              ${drawerItem?.price.toFixed(2)}
            </p>
          </DrawerHeader>
          <div className="space-y-1.5 px-4 pb-2">
            {friends.map((friend) => {
              const isSelected = drawerSelection.includes(friend._id)
              return (
                <div
                  key={friend._id}
                  role="button"
                  tabIndex={0}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-left transition-colors active:bg-accent ${isSelected ? "bg-accent/50" : ""}`}
                  onClick={() => toggleDrawerFriend(friend._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggleDrawerFriend(friend._id)
                    }
                  }}
                >
                  <span className="text-base font-medium">{friend.name}</span>
                  {isSelected ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-5.5 w-5.5"
                    >
                      <circle cx="12" cy="12" r="10" fill="currentColor" className="text-primary" />
                      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-5.5 w-5.5"
                    >
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-muted-foreground/40" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
          <DrawerFooter className="pb-8">
            <Button size="lg" className="h-12 w-full text-base" onClick={saveDrawerSelection}>
              Save
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="lg" className="h-12 w-full text-base">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
