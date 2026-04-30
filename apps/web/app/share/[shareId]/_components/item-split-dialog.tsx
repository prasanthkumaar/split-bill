import type { Doc, Id } from "@convex/_generated/dataModel"
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
  item:
    | {
        lineItemId: Id<"lineItems">
        unitIndex: number
        name: string
        price: number
      }
    | null
  friends: Doc<"friends">[]
  selectedFriendIds: Id<"friends">[]
  onToggleFriend: (friendId: Id<"friends">) => void
  onSave: () => void
}

export function ItemSplitDialog({
  open,
  onOpenChange,
  item,
  friends,
  selectedFriendIds,
  onToggleFriend,
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
          {friends.map((friend) => {
            const isSelected = selectedFriendIds.includes(friend._id)
            return (
              <div
                key={friend._id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-left transition-colors active:bg-accent ${isSelected ? "bg-accent/50" : ""}`}
                onClick={() => onToggleFriend(friend._id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onToggleFriend(friend._id)
                  }
                }}
              >
                <span className="text-base font-medium">{friend.name}</span>
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
