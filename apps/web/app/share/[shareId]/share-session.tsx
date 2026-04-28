"use client"

import { useEffect, useState } from "react"
import { useAuth, useClerk } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { ChevronDown } from "lucide-react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
import { IdentityDialog } from "./_components/identity-dialog"
import { ShareReceiptCard } from "./_components/share-receipt-card"
import { ReviewStatusCard } from "./_components/review-status-card"
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
  const { isLoaded, userId } = useAuth()
  const clerk = useClerk()
  const data = useQuery(api.sharing.getShareSession, { shareId })
  const prepareShareSession = useMutation(api.sharing.prepareShareSession)
  const setDone = useMutation(api.sharing.setDone)
  const setClaimers = useMutation(api.sharing.setClaimers)

  const [showBreakdown, setShowBreakdown] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerItem, setDrawerItem] = useState<DrawerItem>(null)
  const [drawerSelection, setDrawerSelection] = useState<Id<"friends">[]>([])
  const [preparedShareId, setPreparedShareId] = useState<string | null>(null)
  const [prepareError, setPrepareError] = useState<string | null>(null)
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false)
  const [isTogglingDone, setIsTogglingDone] = useState(false)
  const [currentParticipantId, setCurrentParticipantId] =
    useState<Id<"friends"> | null>(null)

  useEffect(() => {
    setPreparedShareId(null)
    setPrepareError(null)
    setIdentityDialogOpen(false)
    setCurrentParticipantId(null)
  }, [shareId])

  useEffect(() => {
    if (
      data === undefined ||
      data === null ||
      !isLoaded ||
      preparedShareId === shareId
    ) {
      return
    }

    let cancelled = false

    prepareShareSession({ shareId })
      .then((result) => {
        if (cancelled) {
          return
        }

        setCurrentParticipantId(result?.currentParticipantId ?? null)
        setIdentityDialogOpen(false)
        setPreparedShareId(shareId)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setPrepareError(
          error instanceof Error
            ? error.message
            : "Unable to load share session"
        )
        setPreparedShareId(shareId)
      })

    return () => {
      cancelled = true
    }
  }, [data, isLoaded, prepareShareSession, preparedShareId, shareId])

  if (data === null) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Bill not found</p>
      </div>
    )
  }

  if (data === undefined || !isLoaded || preparedShareId !== shareId) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (prepareError) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">{prepareError}</p>
      </div>
    )
  }

  const { bill, lineItems, participants, claims, receiptUrl } = data

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
    claimsByItem.get(key)!.push(claim.participantId)
  }

  const participantTotals = new Map<
    string,
    {
      name: string
      items: { name: string; amount: number }[]
      subtotal: number
    }
  >()

  for (const participant of participants) {
    participantTotals.set(participant.id, {
      name: participant.name,
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
      for (const participantId of claimers) {
        const entry = participantTotals.get(participantId)
        if (!entry) {
          continue
        }

        entry.items.push({ name: item.name, amount: perPerson })
        entry.subtotal += perPerson
      }
    }
  }

  const claimedSubtotal = Array.from(participantTotals.values()).reduce(
    (sum, participantTotal) => sum + participantTotal.subtotal,
    0
  )
  const assignedExtras =
    subtotal > 0 ? extras * (claimedSubtotal / subtotal) : 0
  const unclaimed = subtotal - claimedSubtotal + (extras - assignedExtras)
  const splits = Array.from(participantTotals.entries()).map(
    ([id, participantTotal]) => {
      const proportion = subtotal > 0 ? participantTotal.subtotal / subtotal : 0
      const extraShare = extras * proportion

      return {
        id,
        name: participantTotal.name,
        items: participantTotal.items,
        subtotal: participantTotal.subtotal,
        extras: extraShare,
        total: participantTotal.subtotal + extraShare,
      }
    }
  )

  const expandedItems = lineItems.flatMap((item) =>
    Array.from({ length: item.quantity }, (_, unitIndex) => ({
      ...item,
      unitIndex,
      displayPrice: item.unitPrice,
    }))
  )

  const participantOptions = getParticipantOptions(participants)
  const participantLabelById = new Map(
    participantOptions.map((participant) => [participant.id, participant.label])
  )
  const currentParticipant =
    currentParticipantId === null
      ? null
      : (participants.find(
          (participant) => participant.id === currentParticipantId
        ) ?? null)

  if (currentParticipantId !== null && !currentParticipant) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

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
          participantIds: newIds,
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
          participantIds: drawerSelection,
        })
        setDrawerOpen(false)
      } catch (error) {
        console.error("Failed to save split selection:", error)
      }
    })()
  }

  const toggleDrawerParticipant = (participantId: Id<"friends">) => {
    setDrawerSelection((currentSelection) =>
      currentSelection.includes(participantId)
        ? currentSelection.filter((id) => id !== participantId)
        : [...currentSelection, participantId]
    )
  }

  const handleSelectParticipant = async (participantId: Id<"friends">) => {
    const participant = participants.find((entry) => entry.id === participantId)

    if (!participant) {
      return
    }

    if (participant.role === "owner" && userId !== bill.ownerId) {
      await clerk.redirectToSignIn({ redirectUrl: `/share/${shareId}` })
      return
    }

    setCurrentParticipantId(participant.id)
    setIdentityDialogOpen(false)
  }

  const handleToggleDone = () => {
    if (!currentParticipant) {
      return
    }

    setIsTogglingDone(true)
    void setDone({
      billId: bill._id,
      participantId: currentParticipant.id,
      done: currentParticipant.doneAt === null,
    }).finally(() => {
      setIsTogglingDone(false)
    })
  }

  return (
    <div className="mx-auto max-w-6xl p-5 md:grid md:grid-cols-[2fr_3fr] md:gap-4">
      <div className="space-y-3 md:sticky md:top-5 md:max-h-[calc(100vh-2.5rem)] md:self-start md:overflow-y-auto">
        <div className="md:pr-4">
          <h1 className="min-w-0 text-xl font-semibold">{bill.name}</h1>
        </div>
        <ShareReceiptCard receiptUrl={receiptUrl} />
        {currentParticipant ? (
          <ReviewStatusCard
            participants={participants}
            splits={splits}
            currentParticipantId={currentParticipant.id}
            showBreakdown={showBreakdown}
            onToggleBreakdown={() => setShowBreakdown((current) => !current)}
            total={total}
            unclaimed={unclaimed}
          />
        ) : null}
      </div>

      <div className="space-y-4">
        {currentParticipant ? (
          <SplitList
            expandedItems={expandedItems}
            claimsByItem={claimsByItem}
            participants={participantOptions}
            participantLabelById={participantLabelById}
            headerActions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  data-testid="current-participant-trigger"
                  variant="outline"
                  size="default"
                  className="shrink-0 gap-2"
                  onClick={() => setIdentityDialogOpen(true)}
                >
                  {currentParticipant.name}
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  data-testid="done-toggle"
                  type="button"
                  size="default"
                  className="shrink-0"
                  variant={
                    currentParticipant.doneAt === null && !isTogglingDone
                      ? "default"
                      : "outline"
                  }
                  onClick={handleToggleDone}
                  disabled={isTogglingDone}
                >
                  {currentParticipant.doneAt === null ? "Approve" : "Reviewed"}
                </Button>
              </div>
            }
            isDesktop={isDesktop}
            onClaimIdsChange={handleClaimChange}
            onOpenItemSplit={openDrawer}
          />
        ) : null}
      </div>

      <IdentityDialog
        open={identityDialogOpen || currentParticipant === null}
        currentParticipantId={currentParticipantId}
        participants={participants}
        onSelectParticipant={handleSelectParticipant}
      />

      {currentParticipant ? (
        <ItemSplitDialog
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          item={drawerItem}
          participants={participants}
          selectedParticipantIds={drawerSelection}
          onToggleParticipant={toggleDrawerParticipant}
          onSave={saveDrawerSelection}
        />
      ) : null}
    </div>
  )
}

function getParticipantOptions(
  participants: {
    id: Id<"friends">
    name: string
    role: "owner" | "guest"
  }[]
) {
  const counts = new Map<string, number>()
  for (const participant of participants) {
    counts.set(participant.name, (counts.get(participant.name) ?? 0) + 1)
  }

  const nextIndexByName = new Map<string, number>()

  return participants.map((participant) => {
    const duplicateCount = counts.get(participant.name) ?? 0

    if (participant.role === "owner") {
      return {
        ...participant,
        label: `${participant.name} (owner)`,
      }
    }

    if (duplicateCount > 1) {
      const nextIndex = (nextIndexByName.get(participant.name) ?? 0) + 1
      nextIndexByName.set(participant.name, nextIndex)

      return {
        ...participant,
        label: `${participant.name} (${nextIndex})`,
      }
    }

    return {
      ...participant,
      label: participant.name,
    }
  })
}
