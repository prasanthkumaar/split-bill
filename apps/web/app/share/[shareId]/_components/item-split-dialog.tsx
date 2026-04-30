import type { Id } from "@convex/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import { SelectionIcon } from "./selection-icon"
import { ResponsiveDrawerDialog } from "./responsive-drawer-dialog"

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
    <ResponsiveDrawerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item?.name ?? ""}
      description={item ? `$${item.price.toFixed(2)}` : undefined}
      desktopMode="drawer"
      footer={
        <>
          <Button
            size="lg"
            className="h-12 w-full text-base"
            onClick={onSave}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 w-full text-base"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
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
    </ResponsiveDrawerDialog>
  )
}
