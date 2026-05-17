"use client"

import type { Id } from "@convex/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { ResponsiveDrawerDialog } from "./responsive-drawer-dialog"
import { SelectionIcon } from "./selection-icon"

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
      // Identity stays open until currentParticipantId changes through
      // onSelectParticipant, because the share page should not be interactive
      // before someone explicitly chooses who they are.
      title="Review your share"
      description={
        <>
          <span>Select your name and check your items.</span>
          <span className="block">
            Please wait to pay until everyone has reviewed.
          </span>
        </>
      }
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
