"use client"

import type { Id } from "@convex/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
  participants: {
    id: Id<"friends">
    name: string
    role: "owner" | "guest"
  }[]
  onSelectParticipant: (participantId: Id<"friends">) => void | Promise<void>
}

export function IdentityDialog({
  open,
  participants,
  onSelectParticipant,
}: IdentityDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const content = (
    <>
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">
          Pick your name to start reviewing this bill.
        </div>
      </div>
      <div className="space-y-2 px-4 pb-4 md:px-0 md:pb-0">
        {participants.map((participant) => (
          <Button
            key={participant.id}
            type="button"
            variant="outline"
            className="h-auto w-full justify-between px-4 py-3 text-left"
            onClick={() => onSelectParticipant(participant.id)}
          >
            <span className="font-medium">{participant.name}</span>
            {participant.role === "owner" ? <Badge>Owner</Badge> : null}
          </Button>
        ))}
      </div>
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Who are you?</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>Who are you?</DrawerTitle>
        </DrawerHeader>
        {content}
      </DrawerContent>
    </Drawer>
  )
}
