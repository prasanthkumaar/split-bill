import type { Doc, Id } from "@convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@workspace/ui/components/combobox"

type SplitListProps = {
  expandedItems: (Doc<"lineItems"> & {
    unitIndex: number
    displayPrice: number
  })[]
  claimsByItem: Map<string, Id<"friends">[]>
  friends: Doc<"friends">[]
  isDesktop: boolean
  onClaimIdsChange: (
    newIds: Id<"friends">[],
    currentClaimerIds: Id<"friends">[],
    lineItemId: Id<"lineItems">,
    unitIndex: number
  ) => void
  onOpenItemSplit: (
    lineItemId: Id<"lineItems">,
    unitIndex: number,
    name: string,
    price: number,
    currentClaimerIds: Id<"friends">[]
  ) => void
}

export function SplitList({
  expandedItems,
  claimsByItem,
  friends,
  isDesktop,
  onClaimIdsChange,
  onOpenItemSplit,
}: SplitListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">Split bill</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tag everyone to what they had
        </p>
      </CardHeader>
      <CardContent className="mt-1 space-y-3">
        {expandedItems.map((item) => {
          const claimKey = `${item._id}:${item.unitIndex}`
          const claimerIds = claimsByItem.get(claimKey) ?? []

          return (
            <div key={`${item._id}-${item.unitIndex}`}>
              <div className="space-y-1 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm font-medium">
                    ${item.displayPrice.toFixed(2)}
                  </span>
                </div>

                {isDesktop ? (
                  <Combobox
                    items={friends.map((friend) => friend._id)}
                    multiple
                    value={claimerIds}
                    onValueChange={(ids: string[]) =>
                      onClaimIdsChange(
                        ids as Id<"friends">[],
                        claimerIds,
                        item._id,
                        item.unitIndex
                      )
                    }
                  >
                    <ComboboxChips className="mt-2 min-h-9 text-xs">
                      <ComboboxValue>
                        {claimerIds.map((friendId) => {
                          const name =
                            friends.find((friend) => friend._id === friendId)?.name ?? ""
                          return (
                            <ComboboxChip key={friendId}>{name}</ComboboxChip>
                          )
                        })}
                      </ComboboxValue>
                      <ComboboxChipsInput
                        placeholder={claimerIds.length > 0 ? "" : "Add people..."}
                      />
                    </ComboboxChips>
                    <ComboboxContent>
                      <ComboboxEmpty>No one found.</ComboboxEmpty>
                      <ComboboxList>
                        {(friendId) => (
                          <ComboboxItem key={friendId} value={friendId}>
                            {friends.find((friend) => friend._id === friendId)?.name ??
                              friendId}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                ) : (
                  <button
                    type="button"
                    className="mt-2 flex min-h-9 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-sm transition-colors dark:bg-input/30"
                    onClick={() =>
                      onOpenItemSplit(
                        item._id,
                        item.unitIndex,
                        item.name,
                        item.displayPrice,
                        claimerIds
                      )
                    }
                  >
                    {claimerIds.length > 0 ? (
                      claimerIds.map((friendId) => {
                        const name =
                          friends.find((friend) => friend._id === friendId)?.name ?? ""
                        return (
                          <span
                            key={friendId}
                            className="flex h-6 items-center rounded-sm bg-muted px-2 text-sm font-medium dark:bg-indigo-400/20"
                          >
                            {name}
                          </span>
                        )
                      })
                    ) : (
                      <span className="text-muted-foreground">Add people...</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
