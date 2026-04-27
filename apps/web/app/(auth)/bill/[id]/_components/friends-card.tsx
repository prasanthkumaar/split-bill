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

type FriendsCardProps = {
  friends: Doc<"friends">[] | undefined
  claimsByFriend: Map<string, number>
  newFriendName: string
  onNewFriendNameChange: (value: string) => void
  onAddFriend: () => void
  onDeleteFriend: (friend: Doc<"friends">, claimCount: number) => void
}

export function FriendsCard({
  friends,
  claimsByFriend,
  newFriendName,
  onNewFriendNameChange,
  onAddFriend,
  onDeleteFriend,
}: FriendsCardProps) {
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
              onClick={() =>
                onDeleteFriend(friend, claimsByFriend.get(friend._id) ?? 0)
              }
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onAddFriend()
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Friend's name"
            value={newFriendName}
            onChange={(event) => onNewFriendNameChange(event.target.value)}
          />
          <Button type="submit" size="icon" disabled={!newFriendName.trim()}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
