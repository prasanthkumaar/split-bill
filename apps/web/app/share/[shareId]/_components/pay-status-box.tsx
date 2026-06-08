import { Button } from "@workspace/ui/components/button"

type PayStatusBoxProps = {
  role: "owner" | "guest"
  yourShare: number
  owedToOwner: number
  paid: boolean
  settled: boolean
  paidCount: number
  guestCount: number
  isToggling: boolean
  onTogglePaid: () => void
}

// Shown once everyone has reviewed. Pay and settled share one stable card:
// main text + subtext on the left, the amount on the right, a progress bar, then
// the action. Settled keeps the exact same layout — only the subtext, colour and
// progress fill change. The owner is owed and never pays.
export function PayStatusBox({
  role,
  yourShare,
  owedToOwner,
  paid,
  settled,
  paidCount,
  guestCount,
  isToggling,
  onTogglePaid,
}: PayStatusBoxProps) {
  const isOwner = role === "owner"
  const mainText = isOwner ? "Owed to you" : "Your share"
  const amount = isOwner ? owedToOwner : yourShare
  const subtext = settled
    ? "All settled · everyone has paid"
    : isOwner
      ? `${paidCount} of ${guestCount} have paid you`
      : `${paidCount} of ${guestCount} paid`
  const progress =
    settled || guestCount === 0 ? 100 : (paidCount / guestCount) * 100

  return (
    <div
      className={`space-y-4 rounded-xl border p-5 ${
        settled ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">{mainText}</div>
          <div
            className={`text-xs ${
              settled
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            }`}
          >
            {subtext}
          </div>
        </div>
        <div
          className={`text-3xl font-bold tabular-nums ${
            settled ? "text-emerald-700 dark:text-emerald-400" : ""
          }`}
        >
          ${amount.toFixed(2)}
        </div>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Payment progress: ${paidCount} of ${guestCount} paid`}
      >
        <div
          className={`h-full rounded-full transition-all ${
            settled ? "bg-emerald-500" : "bg-foreground/60"
          }`}
          style={{ width: `${progress}%` }}
        />
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
          {paid ? "Undo payment" : "I've paid"}
        </Button>
      ) : null}
    </div>
  )
}
