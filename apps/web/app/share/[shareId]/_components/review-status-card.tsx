import type { Id } from "@convex/_generated/dataModel"
import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { ReviewTransferStatus } from "./review-transfer-status"
import { PayStatusBox } from "./pay-status-box"

type ReviewStatusCardParticipant = {
  id: Id<"friends">
  name: string
  role: "owner" | "guest"
  doneAt: number | null
  paidAt: number | null
}

type ReviewStatusCardProps = {
  participants: ReviewStatusCardParticipant[]
  splits: {
    id: string
    name: string
    items: { name: string; amount: number }[]
    extras: number
    total: number
  }[]
  currentParticipantId: Id<"friends">
  showBreakdown: boolean
  onToggleBreakdown: () => void
  total: number
  unclaimed: number
  settled: boolean
  isTogglingReviewed: boolean
  isTogglingPaid: boolean
  actionError: string | null
  onToggleReviewed: () => void
  onTogglePaid: () => void
}

export function ReviewStatusCard({
  participants,
  splits,
  currentParticipantId,
  showBreakdown,
  onToggleBreakdown,
  total,
  unclaimed,
  settled,
  isTogglingReviewed,
  isTogglingPaid,
  actionError,
  onToggleReviewed,
  onTogglePaid,
}: ReviewStatusCardProps) {
  const doneCount = participants.filter(
    (participant) => participant.doneAt !== null
  ).length
  const allReviewed =
    participants.length > 0 && doneCount === participants.length
  const currentParticipant = participants.find(
    (participant) => participant.id === currentParticipantId
  )
  const splitByParticipantId = new Map(splits.map((split) => [split.id, split]))

  if (!currentParticipant) {
    return null
  }

  const displayParticipants: typeof participants = [
    currentParticipant,
    ...participants.filter(
      (participant) => participant.id !== currentParticipantId
    ),
  ]

  const yourShare = splitByParticipantId.get(currentParticipant.id)?.total ?? 0

  return (
    <section className="space-y-6 md:pr-4">
      {allReviewed ? (
        <PayStatusBox
          role={currentParticipant.role}
          yourShare={yourShare}
          paid={currentParticipant.paidAt !== null}
          settled={settled}
          isToggling={isTogglingPaid}
          onTogglePaid={onTogglePaid}
        />
      ) : (
        <ReviewTransferStatus
          doneCount={doneCount}
          participantCount={participants.length}
          action={
            <Button
              data-testid="done-toggle"
              type="button"
              aria-pressed={currentParticipant.doneAt !== null}
              className="w-full"
              variant={
                currentParticipant.doneAt === null && !isTogglingReviewed
                  ? "default"
                  : "outline"
              }
              onClick={onToggleReviewed}
              disabled={isTogglingReviewed}
            >
              {currentParticipant.doneAt === null
                ? "I've reviewed"
                : "Reviewed"}
            </Button>
          }
        />
      )}

      {actionError ? (
        <p className="text-sm text-red-500">{actionError}</p>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold">Summary</h2>
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 px-2"
              onClick={onToggleBreakdown}
            >
              {showBreakdown ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
              {showBreakdown ? "Hide breakdown" : "Show breakdown"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {displayParticipants.map((participant) => {
          const split = splitByParticipantId.get(participant.id)

          return (
            <div
              key={participant.id}
              data-testid="review-participant"
              className="space-y-2"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-medium">{participant.name}</span>
                  <StatusBadge
                    allReviewed={allReviewed}
                    role={participant.role}
                    reviewed={participant.doneAt !== null}
                    paid={participant.paidAt !== null}
                  />
                </div>
                <span />
                <span className="text-right font-semibold tabular-nums">
                  ${(split?.total ?? 0).toFixed(2)}
                </span>
              </div>

              {showBreakdown && split && split.total > 0 ? (
                <div className="space-y-0.5">
                  {split.items.map((item, index) => (
                    <div
                      key={`${participant.id}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 text-xs text-muted-foreground"
                    >
                      <span>{item.name}</span>
                      <span />
                      <span className="text-right tabular-nums">
                        ${item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 text-xs text-muted-foreground">
                    <span>Tax & svc charge</span>
                    <span />
                    <span className="text-right tabular-nums">
                      ${split.extras.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <Separator />

      <div className="space-y-4 pb-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3">
          <span className="font-medium">Bill total</span>
          <span />
          <span className="text-right font-semibold tabular-nums">
            ${total.toFixed(2)}
          </span>
        </div>

        {unclaimed > 0 ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 text-red-500">
            <span className="font-medium">Unaccounted</span>
            <span />
            <span className="text-right font-semibold tabular-nums">
              ${unclaimed.toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}

type StatusBadgeProps = {
  allReviewed: boolean
  role: "owner" | "guest"
  reviewed: boolean
  paid: boolean
}

// In the review phase everyone shows Reviewed/Pending. Once everyone has
// reviewed, guests show Paid/Unpaid; the owner is owed, so shows no paid badge.
function StatusBadge({ allReviewed, role, reviewed, paid }: StatusBadgeProps) {
  if (allReviewed) {
    if (role === "owner") {
      return null
    }

    return paid ? (
      <Badge className="gap-1 border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3" />
        Paid
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1">
        <Circle className="size-3" />
        Unpaid
      </Badge>
    )
  }

  return reviewed ? (
    <Badge variant="secondary" className="gap-1">
      <CheckCircle2 className="size-3" />
      Reviewed
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <Circle className="size-3" />
      Pending
    </Badge>
  )
}
