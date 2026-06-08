import { CheckCircle2, CreditCard, PartyPopper } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

type PayStatusBoxProps = {
  role: "owner" | "guest"
  yourShare: number
  paid: boolean
  settled: boolean
  isToggling: boolean
  onTogglePaid: () => void
}

// Shown once everyone has reviewed: the review box becomes the pay box, with the
// amount to pay front and centre. The owner is owed, so they only see the
// amount; guests get the reversible "I've paid" action.
export function PayStatusBox({
  role,
  yourShare,
  paid,
  settled,
  isToggling,
  onTogglePaid,
}: PayStatusBoxProps) {
  const title = settled ? "All settled" : "All members have reviewed"
  const subtitle = settled
    ? "Everyone has paid their share"
    : role === "owner"
      ? "Here's your share"
      : "You're clear to settle up"

  return (
    <div
      className={`space-y-3 rounded-lg border px-4 py-4 ${
        settled
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-primary/30 bg-primary/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div
            className={`flex items-center gap-1.5 text-sm font-semibold ${
              settled
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-primary"
            }`}
          >
            {settled ? (
              <PartyPopper className="size-4" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {title}
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground">Your share</div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              settled ? "" : "text-primary"
            }`}
          >
            ${yourShare.toFixed(2)}
          </div>
        </div>
      </div>

      {role === "guest" ? (
        <Button
          data-testid="paid-toggle"
          type="button"
          aria-pressed={paid}
          className="w-full"
          variant={paid ? "outline" : "default"}
          onClick={onTogglePaid}
          disabled={isToggling}
        >
          {paid ? (
            <>
              <CheckCircle2 className="size-4" />
              Paid
            </>
          ) : (
            <>
              <CreditCard className="size-4" />
              I&apos;ve paid
            </>
          )}
        </Button>
      ) : null}
    </div>
  )
}
