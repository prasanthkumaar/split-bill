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
  selectedFriendIds: string[]
  onToggleFriend: (friendId: string) => void
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
                {isSelected ? (
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
                ) : (
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
                )}
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
