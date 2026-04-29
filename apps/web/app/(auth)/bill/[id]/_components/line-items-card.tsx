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
import { useForm } from "react-hook-form"

type UpdateLineItemInput = {
  id: Id<"lineItems">
  name?: string
  quantity?: number
  unitPrice?: number
}

type LineItemsCardProps = {
  lineItems: Doc<"lineItems">[] | undefined
  claimsByItem: Map<string, number>
  onAddItem: (input: {
    name: string
    quantity: number
    unitPrice: number
  }) => Promise<void> | void
  onUpdateItem: (input: UpdateLineItemInput) => void
  onDeleteItem: (item: Doc<"lineItems">, claimCount: number) => void
}

type LineItemsFormValues = {
  name: string
  quantity: string
  unitPrice: string
}

function clampQuantityValue(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 1
  }

  return Math.max(1, Math.floor(parsed))
}

function clampCurrencyValue(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(0, Math.round(parsed * 100) / 100)
}

export function LineItemsCard({
  lineItems,
  claimsByItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: LineItemsCardProps) {
  const { register, handleSubmit, reset, watch } = useForm<LineItemsFormValues>({
    defaultValues: {
      name: "",
      quantity: "1",
      unitPrice: "",
    },
  })

  const newItemName = watch("name")
  const newItemPrice = watch("unitPrice")

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
                  quantity: clampQuantityValue(event.target.value),
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
                  unitPrice: clampCurrencyValue(event.target.value),
                })
              }
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label={`Delete ${item.name}`}
              onClick={() => onDeleteItem(item, claimsByItem.get(item._id) ?? 0)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        <Separator />

        <form
          onSubmit={handleSubmit(async ({ name, quantity, unitPrice }) => {
            const trimmedName = name.trim()
            if (!trimmedName || !unitPrice) return

            await onAddItem({
              name: trimmedName,
              quantity: clampQuantityValue(quantity),
              unitPrice: clampCurrencyValue(unitPrice),
            })

            reset({
              name: "",
              quantity: "1",
              unitPrice: "",
            })
          })}
          className="flex items-center gap-2"
        >
          <Input
            placeholder="Item name"
            className="flex-1"
            {...register("name")}
          />
          <Input
            placeholder="Qty"
            className="w-16 text-center"
            type="number"
            min={1}
            {...register("quantity")}
          />
          <Input
            placeholder="Price"
            className="w-24 text-right"
            type="number"
            step="0.01"
            {...register("unitPrice")}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Add line item"
            disabled={!newItemName.trim() || !newItemPrice}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
