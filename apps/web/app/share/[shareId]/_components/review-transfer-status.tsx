type ReviewTransferStatusProps = {
  doneCount: number
  participantCount: number
}

export function ReviewTransferStatus({
  doneCount,
  participantCount,
}: ReviewTransferStatusProps) {
  const reviewProgress =
    participantCount > 0 ? (doneCount / participantCount) * 100 : 0
  const allReviewed = participantCount > 0 && doneCount === participantCount

  return (
    <div
      className={`space-y-3 rounded-lg border px-4 py-4 ${
        allReviewed ? "border-primary/20 bg-primary/10" : "bg-muted/20"
      }`}
    >
      <div className="space-y-2">
        <div className="text-sm font-medium">
          {doneCount} of {participantCount} reviewed
        </div>
        <div
          data-testid="review-progress"
          className="h-px overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${reviewProgress}%` }}
          />
        </div>
      </div>

      <p
        className={`text-sm leading-relaxed ${
          allReviewed ? "font-medium text-primary" : "text-muted-foreground"
        }`}
      >
        {allReviewed
          ? "All members have reviewed"
          : "Please wait until all members have reviewed as your items might be shared with others, affecting your cost"}
      </p>
    </div>
  )
}
