import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

type ShareHeaderProps = {
  currentParticipantName: string | null
  currentParticipantRole: "owner" | "guest" | null
  onChangeParticipant: () => void
}

export function ShareHeader({
  currentParticipantName,
  currentParticipantRole,
  onChangeParticipant,
}: ShareHeaderProps) {
  return (
    currentParticipantName ? (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Reviewing as</p>
          <div className="flex items-center gap-2">
            <span className="font-medium">{currentParticipantName}</span>
            {currentParticipantRole === "owner" ? <Badge>Owner</Badge> : null}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onChangeParticipant}>
          Change
        </Button>
      </div>
    ) : null
  )
}
