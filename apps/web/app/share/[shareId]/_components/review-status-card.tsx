import type { Id } from "@convex/_generated/dataModel"
import { ChevronDown, Eye, EyeOff } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"

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
  onChangeParticipant: () => void
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
  onChangeParticipant,
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

  return (
    <Card className="mb-4">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              {doneCount} of {participants.length} reviewed
            </p>
          </div>
          <div className="flex items-center gap-1">
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
            <Button
              data-testid="current-participant-trigger"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onChangeParticipant}
            >
              {currentParticipant.name}
              <ChevronDown className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2" data-testid="review-progress">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={`h-2 flex-1 rounded-full ${
                participant.doneAt !== null ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="space-y-2">
          {participants.map((participant) => {
            const split = splitByParticipantId.get(participant.id)

            return (
              <div
                key={participant.id}
                data-testid="review-participant"
                className="space-y-2 rounded-lg border px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-medium">{participant.name}</span>
                    {participant.role === "owner" ? (
                      <Badge variant="secondary">Owner</Badge>
                    ) : null}
                    {participant.id === currentParticipantId ? (
                      <Badge variant="outline">You</Badge>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold">
                      ${(split?.total ?? 0).toFixed(2)}
                    </span>
                    <Button
                      data-testid={
                        participant.id === currentParticipantId
                          ? "done-toggle"
                          : undefined
                      }
                      type="button"
                      size="sm"
                      className="min-w-28"
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
                      disabled={
                        participant.id !== currentParticipantId || isSaving
                      }
                    >
                      {participant.id === currentParticipantId ? (
                        isSaving ? (
                          "Saving..."
                        ) : participant.doneAt !== null ? (
                          "Reviewed"
                        ) : (
                          "Review now"
                        )
                      ) : participant.doneAt !== null ? (
                        "Reviewed"
                      ) : (
                        "Pending"
                      )}
                    </Button>
                  </div>
                </div>

                {showBreakdown && split && split.total > 0 ? (
                  <div className="space-y-0.5 pl-2">
                    {split.items.map((item, index) => (
                      <div
                        key={`${participant.id}-${index}`}
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
                ) : null}
              </div>
            )
          })}
        </div>

        <Separator />

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Bill total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        {unclaimed > 0 ? (
          <div className="flex justify-between text-sm text-red-500">
            <span>Unaccounted</span>
            <span>${unclaimed.toFixed(2)}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
