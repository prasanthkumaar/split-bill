import type { Id } from "@convex/_generated/dataModel"
import { Eye, EyeOff } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { ReviewTransferStatus } from "./review-transfer-status"

type ReviewStatusCardProps = {
  participants: {
    id: Id<"friends">
    name: string
    role: "owner" | "guest"
    doneAt: number | null
  }[]
  splits: {
    id: string
    name: string
    items: { name: string; amount: number }[]
    extras: number
    total: number
  }[]
  currentParticipantId: Id<"friends">
  isSaving: boolean
  showBreakdown: boolean
  onToggleBreakdown: () => void
  onToggleDone: () => void
  total: number
  unclaimed: number
}

export function ReviewStatusCard({
  participants,
  splits,
  currentParticipantId,
  isSaving,
  showBreakdown,
  onToggleBreakdown,
  onToggleDone,
  total,
  unclaimed,
}: ReviewStatusCardProps) {
  const doneCount = participants.filter(
    (participant) => participant.doneAt !== null
  ).length
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

  return (
    <section className="space-y-4 md:pr-4">
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
                  {participant.role === "owner" ? (
                    <Badge variant="secondary">Owner</Badge>
                  ) : null}
                </div>
                <span className="text-right font-semibold tabular-nums">
                  ${(split?.total ?? 0).toFixed(2)}
                </span>
                <Button
                  data-testid={
                    participant.id === currentParticipantId
                      ? "done-toggle"
                      : undefined
                  }
                  type="button"
                  size="default"
                  className="min-w-24 justify-center"
                  variant={
                    participant.id === currentParticipantId &&
                    participant.doneAt === null &&
                    !isSaving
                      ? "default"
                      : "outline"
                  }
                  onClick={
                    participant.id === currentParticipantId
                      ? onToggleDone
                      : undefined
                  }
                  disabled={participant.id !== currentParticipantId || isSaving}
                >
                  {participant.id === currentParticipantId ? (
                    isSaving ? (
                      "Saving..."
                    ) : participant.doneAt !== null ? (
                      "Reviewed"
                    ) : (
                      "I've checked"
                    )
                  ) : participant.doneAt !== null ? (
                    "Reviewed"
                  ) : (
                    "Pending"
                  )}
                </Button>
              </div>

              {showBreakdown && split && split.total > 0 ? (
                <div className="space-y-0.5">
                  {split.items.map((item, index) => (
                    <div
                      key={`${participant.id}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 text-xs text-muted-foreground"
                    >
                      <span>{item.name}</span>
                      <span className="text-right tabular-nums">
                        ${item.amount.toFixed(2)}
                      </span>
                      <span />
                    </div>
                  ))}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 text-xs text-muted-foreground">
                    <span>Tax & svc charge</span>
                    <span className="text-right tabular-nums">
                      ${split.extras.toFixed(2)}
                    </span>
                    <span />
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
          <span className="text-right font-semibold tabular-nums">
            ${total.toFixed(2)}
          </span>
          <span />
        </div>

        {unclaimed > 0 ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 text-red-500">
            <span className="font-medium">Unaccounted</span>
            <span className="text-right font-semibold tabular-nums">
              ${unclaimed.toFixed(2)}
            </span>
            <span />
          </div>
        ) : null}

        <ReviewTransferStatus
          doneCount={doneCount}
          participantCount={participants.length}
        />
      </div>
    </section>
  )
}
