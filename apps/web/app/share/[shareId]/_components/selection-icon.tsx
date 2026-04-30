type SelectionIconProps = {
  selected: boolean
}

export function SelectionIcon({ selected }: SelectionIconProps) {
  if (selected) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-[22px] w-[22px]"
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
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
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
  )
}
