"use client"

import type { Id } from "@convex/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"

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
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const content = (
    <>
      <div className="px-4 md:px-0">
        <div className="text-sm text-muted-foreground">
          Pick your name to start reviewing this bill.
        </div>
      </div>
      <div className="space-y-1.5 px-4 pb-6 md:px-0 md:pb-0">
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
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-lg">Who are you?</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="pb-6">
          <DrawerTitle className="text-lg">Who are you?</DrawerTitle>
        </DrawerHeader>
        {content}
      </DrawerContent>
    </Drawer>
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
