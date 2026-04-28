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
import { XIcon } from "lucide-react"

type ShareReceiptCardProps = {
  receiptUrl?: string | null
}

export function ShareReceiptCard({ receiptUrl }: ShareReceiptCardProps) {
  if (!receiptUrl) {
    return null
  }

  return (
    <Card className="border-none pt-0 pb-0 md:bg-transparent md:shadow-none md:ring-0">
      <CardContent className="space-y-3 py-4 md:px-0 md:py-0 md:pr-4">
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
      </CardContent>
    </Card>
  )
}
