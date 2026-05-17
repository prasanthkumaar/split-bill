type ClerkDisplayUser = {
  firstName?: string | null
  fullName?: string | null
  lastName?: string | null
  primaryEmailAddress?: { emailAddress?: string | null } | null
  username?: string | null
}

export function getClerkDisplayName(user: ClerkDisplayUser | null | undefined) {
  const fullName = user?.fullName?.trim()
  const firstLastName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  const username = user?.username?.trim()
  const emailName = user?.primaryEmailAddress?.emailAddress
    ?.split("@")[0]
    ?.trim()

  return fullName || firstLastName || username || emailName || undefined
}
