import type { Doc } from "@convex/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { UserPlus, X } from "lucide-react"
import { useForm } from "react-hook-form"

type FriendsCardProps = {
  participants: Doc<"friends">[] | undefined
  billOwnerId: string
  claimsByFriend: Map<string, number>
  onAddFriend: (name: string) => Promise<void> | void
  onDeleteFriend: (friend: Doc<"friends">, claimCount: number) => void
}

type FriendsFormValues = {
  name: string
}

export function FriendsCard({
  participants,
  billOwnerId,
  claimsByFriend,
  onAddFriend,
  onDeleteFriend,
}: FriendsCardProps) {
  const { register, handleSubmit, reset, watch } = useForm<FriendsFormValues>({
    defaultValues: {
      name: "",
    },
  })

  const newFriendName = watch("name")

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Participants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {participants?.map((participant) => {
          const isOwner =
            (participant.role ??
              getLegacyParticipantRole(participant, billOwnerId)) === "owner"

          return (
            <div
              key={participant._id}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm">{participant.name}</span>
                {isOwner ? <Badge variant="secondary">Owner</Badge> : null}
              </div>
              {isOwner ? null : (
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label={`Remove ${participant.name}`}
                  onClick={() =>
                    onDeleteFriend(
                      participant,
                      claimsByFriend.get(participant._id) ?? 0
                    )
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )
        })}
        <form
          onSubmit={handleSubmit(async ({ name }) => {
            const trimmedName = name.trim()
            if (!trimmedName) return
            await onAddFriend(trimmedName)
            reset()
          })}
          className="flex gap-2"
        >
          <Input placeholder="Friend's name" {...register("name")} />
          <Button
            type="submit"
            size="icon"
            aria-label="Add friend"
            disabled={!newFriendName.trim()}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function getLegacyParticipantRole(
  participant: Doc<"friends">,
  ownerId: string
) {
  return participant.userId === ownerId ? "owner" : "guest"
}
