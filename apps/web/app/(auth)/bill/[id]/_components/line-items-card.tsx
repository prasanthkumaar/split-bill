import type { Doc, Id } from "@convex/_generated/dataModel"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { Plus, Trash2 } from "lucide-react"

type UpdateLineItemInput = {
  id: Id<"lineItems">
  name?: string
  quantity?: number
  unitPrice?: number
}

type LineItemsCardProps = {
  lineItems: Doc<"lineItems">[] | undefined
  claimsByItem: Map<string, number>
  newItemName: string
  newItemQty: string
  newItemPrice: string
  onNewItemNameChange: (value: string) => void
  onNewItemQtyChange: (value: string) => void
  onNewItemPriceChange: (value: string) => void
  onAddItem: () => void
  onUpdateItem: (input: UpdateLineItemInput) => void
  onDeleteItem: (item: Doc<"lineItems">, claimCount: number) => void
}

export function LineItemsCard({
  lineItems,
  claimsByItem,
  newItemName,
  newItemQty,
  newItemPrice,
  onNewItemNameChange,
  onNewItemQtyChange,
  onNewItemPriceChange,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: LineItemsCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Line Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lineItems?.map((item) => (
          <div key={item._id} className="flex items-center gap-2">
            <Input
              defaultValue={item.name}
              className="flex-1"
              onBlur={(event) =>
                onUpdateItem({ id: item._id, name: event.target.value })
              }
            />
            <Input
              defaultValue={String(item.quantity)}
              className="w-16 text-center"
              type="number"
              min={1}
              onBlur={(event) =>
                onUpdateItem({
                  id: item._id,
                  quantity: Number(event.target.value) || 1,
                })
              }
            />
            <Input
              defaultValue={item.unitPrice.toFixed(2)}
              className="w-24 text-right"
              type="number"
              step="0.01"
              onBlur={(event) =>
                onUpdateItem({
                  id: item._id,
                  unitPrice: Number(event.target.value) || 0,
                })
              }
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteItem(item, claimsByItem.get(item._id) ?? 0)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        <Separator />

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onAddItem()
          }}
          className="flex items-center gap-2"
        >
          <Input
            placeholder="Item name"
            value={newItemName}
            onChange={(event) => onNewItemNameChange(event.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Qty"
            value={newItemQty}
            onChange={(event) => onNewItemQtyChange(event.target.value)}
            className="w-16 text-center"
            type="number"
            min={1}
          />
          <Input
            placeholder="Price"
            value={newItemPrice}
            onChange={(event) => onNewItemPriceChange(event.target.value)}
            className="w-24 text-right"
            type="number"
            step="0.01"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newItemName.trim() || !newItemPrice}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
