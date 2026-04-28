"use client"

import type { Id } from "@convex/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { ResponsiveDrawerDialog } from "./responsive-drawer-dialog"

type IdentityDialogProps = {
  open: boolean
  currentParticipantId?: Id<"friends"> | null
  participants: {
    id: Id<"friends">
    name: string
    role: "owner" | "guest"
  }[]
  onSelectParticipant: (participantId: Id<"friends">) => void | Promise<void>
}

export function IdentityDialog({
  open,
  currentParticipantId,
  participants,
  onSelectParticipant,
}: IdentityDialogProps) {
  return (
    <ResponsiveDrawerDialog
      open={open}
      title="Who are you?"
      description="Pick your name to start reviewing this bill."
      contentClassName="sm:max-w-md"
    >
      <div className="space-y-1.5">
        {participants.map((participant) => {
          const isSelected = participant.id === currentParticipantId

          return (
            <button
              key={participant.id}
              type="button"
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors active:bg-accent ${isSelected ? "bg-accent/50" : ""}`}
              onClick={() => onSelectParticipant(participant.id)}
            >
              <span className="text-base font-medium">{participant.name}</span>
              <div className="flex items-center gap-3">
                {participant.role === "owner" ? <Badge>Owner</Badge> : null}
                <SelectionIcon selected={isSelected} />
              </div>
            </button>
          )
        })}
      </div>
    </ResponsiveDrawerDialog>
  )
}

function SelectionIcon({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-5.5 w-5.5"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="currentColor"
          className="text-primary"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5.5 w-5.5"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-muted-foreground/40"
      />
    </svg>
  )
}
