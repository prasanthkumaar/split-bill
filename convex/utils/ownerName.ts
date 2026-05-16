import type { UserIdentity } from "convex/server"

export function getOwnerParticipantName(identity: UserIdentity | null) {
  if (!identity) {
    return "Owner"
  }

  const fullName = [identity.givenName, identity.familyName]
    .filter(Boolean)
    .join(" ")
    .trim()

  return (
    identity.name?.trim() ||
    fullName ||
    identity.preferredUsername?.trim() ||
    identity.nickname?.trim() ||
    identity.email?.split("@")[0]?.trim() ||
    "Owner"
  )
}
