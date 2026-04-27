import type { Id } from "@convex/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { SelectionIcon } from "./selection-icon"

type ItemSplitDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: {
    lineItemId: Id<"lineItems">
    unitIndex: number
    name: string
    price: number
  } | null
  participants: {
    id: Id<"friends">
    name: string
    role: "owner" | "guest"
  }[]
  selectedParticipantIds: Id<"friends">[]
  onToggleParticipant: (participantId: Id<"friends">) => void
  onSave: () => void
}

export function ItemSplitDialog({
  open,
  onOpenChange,
  item,
  participants,
  selectedParticipantIds,
  onToggleParticipant,
  onSave,
}: ItemSplitDialogProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="pb-6">
          <DrawerTitle className="text-lg">{item?.name}</DrawerTitle>
          <p className="text-sm text-muted-foreground">
            ${item?.price.toFixed(2)}
          </p>
        </DrawerHeader>
        <div className="space-y-1.5 px-4 pb-2">
          {participants.map((participant) => {
            const isSelected = selectedParticipantIds.includes(participant.id)

            return (
              <div
                key={participant.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-left transition-colors active:bg-accent ${isSelected ? "bg-accent/50" : ""}`}
                onClick={() => onToggleParticipant(participant.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onToggleParticipant(participant.id)
                  }
                }}
              >
                <span className="text-base font-medium">{participant.name}</span>
                <SelectionIcon selected={isSelected} />
              </div>
            )
          })}
        </div>
        <DrawerFooter className="pb-8">
          <Button size="lg" className="h-12 w-full text-base" onClick={onSave}>
            Save
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" size="lg" className="h-12 w-full text-base">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
