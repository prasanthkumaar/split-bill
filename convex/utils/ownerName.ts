import type { UserIdentity } from "convex/server"

export function getOwnerParticipantName(
  identity: UserIdentity,
  ownerName?: string
) {
  const clientOwnerName = ownerName?.trim()
  const fullName = [identity.givenName, identity.familyName]
    .filter(Boolean)
    .join(" ")
    .trim()

  return (
    clientOwnerName ||
    identity.name?.trim() ||
    fullName ||
    identity.preferredUsername?.trim() ||
    identity.nickname?.trim() ||
    identity.email?.split("@")[0]?.trim() ||
    "Owner"
  )
}
