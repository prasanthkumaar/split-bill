import type { Doc, Id } from "@convex/_generated/dataModel"
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
  friends: Doc<"friends">[] | undefined
  claimsByFriend: Map<string, number>
  onAddFriend: (name: string) => Promise<void> | void
  onDeleteFriend: (friend: Doc<"friends">, claimCount: number) => void
}

type FriendsFormValues = {
  name: string
}

export function FriendsCard({
  friends,
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
        <CardTitle className="text-base">Friends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {friends?.map((friend) => (
          <div key={friend._id} className="flex items-center justify-between">
            <span className="text-sm">{friend.name}</span>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label={`Remove ${friend.name}`}
              onClick={() =>
                onDeleteFriend(friend, claimsByFriend.get(friend._id) ?? 0)
              }
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
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
