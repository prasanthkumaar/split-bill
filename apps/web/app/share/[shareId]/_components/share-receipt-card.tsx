import Image from "next/image"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Separator } from "@workspace/ui/components/separator"
import { Eye, EyeOff, XIcon } from "lucide-react"

type ShareReceiptCardProps = {
  receiptUrl?: string | null
  splits: {
    id: string
    name: string
    items: { name: string; amount: number }[]
    subtotal: number
    extras: number
    total: number
  }[]
  showBreakdown: boolean
  onToggleBreakdown: () => void
  total: number
  unclaimed: number
}

export function ShareReceiptCard({
  receiptUrl,
  splits,
  showBreakdown,
  onToggleBreakdown,
  total,
  unclaimed,
}: ShareReceiptCardProps) {
  return (
    <Card className="mb-4 border-none pt-0 md:bg-transparent md:shadow-none md:ring-0">
      <CardContent className="space-y-3 py-4 md:px-0 md:py-0 md:pr-4">
        {receiptUrl && (
          <Dialog>
            <div className="relative h-40 w-full overflow-hidden rounded-lg md:h-72">
              <Image
                src={receiptUrl}
                alt="Receipt"
                fill
                className="object-cover"
              />
            </div>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="w-full">
                View full receipt
              </Button>
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              className="w-[95vw]! max-w-[95vw]! gap-0! overflow-hidden rounded-2xl! p-0! sm:w-fit!"
            >
              <DialogTitle className="sr-only">Receipt</DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="absolute top-2 right-2 z-10 rounded-full bg-background/80 backdrop-blur-sm"
                >
                  <XIcon />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
              <Image
                src={receiptUrl}
                alt="Receipt"
                width={600}
                height={800}
                className="max-h-[95vh] w-full sm:w-auto"
              />
            </DialogContent>
          </Dialog>
        )}

        <div className="mt-4 flex justify-between">
          <div className="text-lg font-bold">Summary</div>
          {splits.some((split) => split.total > 0) && (
            <button
              className="flex items-center gap-1 text-sm font-medium text-primary dark:text-indigo-200"
              onClick={onToggleBreakdown}
            >
              {showBreakdown ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {showBreakdown ? "Hide breakdown" : "Show breakdown"}
            </button>
          )}
        </div>

        {splits
          .filter((split) => split.total > 0)
          .map((split) => (
            <div key={split.id}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{split.name}</span>
                <span className="font-semibold">${split.total.toFixed(2)}</span>
              </div>
              {showBreakdown && (
                <div className="mt-1 mb-2 ml-2 space-y-0.5">
                  {split.items.map((item, index) => (
                    <div
                      key={`${split.id}-${index}`}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span>{item.name}</span>
                      <span>${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tax & svc charge</span>
                    <span>${split.extras.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

        {splits.every((split) => split.total === 0) && (
          <p className="text-center text-sm text-muted-foreground">
            No items claimed yet.
          </p>
        )}

        <Separator />

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Bill total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        {unclaimed > 0 && (
          <div className="flex justify-between text-sm text-red-500">
            <span>Unaccounted</span>
            <span>${unclaimed.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
