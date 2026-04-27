import { UserButton } from "@clerk/nextjs"
import { Button } from "@workspace/ui/components/button"
import { ArrowLeft } from "lucide-react"

type BillHeaderProps = {
  name: string
  status: string
  onBack: () => void
}

export function BillHeader({ name, status, onBack }: BillHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{name}</h1>
          <p className="text-muted-foreground text-xs">{status}</p>
        </div>
      </div>
      <UserButton />
    </div>
  )
}
