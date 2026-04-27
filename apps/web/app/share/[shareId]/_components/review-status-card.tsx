import type { Id } from "@convex/_generated/dataModel"
import { ChevronDown } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type ReviewStatusCardProps = {
  participants: {
    id: Id<"friends">
    name: string
    role: "owner" | "guest"
    doneAt: number | null
  }[]
  currentParticipantId: Id<"friends">
  onChangeParticipant: () => void
  onToggleDone: () => void
}

export function ReviewStatusCard({
  participants,
  currentParticipantId,
  onChangeParticipant,
  onToggleDone,
}: ReviewStatusCardProps) {
  const doneCount = participants.filter(
    (participant) => participant.doneAt !== null
  ).length
  const currentParticipant = participants.find(
    (participant) => participant.id === currentParticipantId
  )

  if (!currentParticipant) {
    return null
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">Review status</CardTitle>
            <p className="text-sm text-muted-foreground">
              {doneCount} of {participants.length} done
            </p>
          </div>
          <div className="flex items-center gap-1">
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
            <Button
              data-testid="done-toggle"
              size="sm"
              variant={
                currentParticipant.doneAt !== null ? "outline" : "default"
              }
              onClick={onToggleDone}
            >
              {currentParticipant.doneAt !== null
                ? "Mark not done"
                : "Mark done"}
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
          {participants.map((participant) => (
            <div
              key={participant.id}
              data-testid="review-participant"
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{participant.name}</span>
                {participant.role === "owner" ? (
                  <Badge variant="secondary">Owner</Badge>
                ) : null}
                {participant.id === currentParticipantId ? (
                  <Badge variant="outline">You</Badge>
                ) : null}
              </div>
              <Badge
                variant={participant.doneAt !== null ? "default" : "outline"}
              >
                {participant.doneAt !== null ? "Done" : "Pending"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
