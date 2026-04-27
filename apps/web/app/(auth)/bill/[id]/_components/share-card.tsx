import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Check, Copy, Share2 } from "lucide-react"

type ShareCardProps = {
  status: string
  shareUrl: string
  copied: boolean
  hasFriends: boolean
  hasLineItems: boolean
  onShare: () => void
  onCopy: () => void
  onViewSplit: () => void
}

export function ShareCard({
  status,
  shareUrl,
  copied,
  hasFriends,
  hasLineItems,
  onShare,
  onCopy,
  onViewSplit,
}: ShareCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {status === "editing" ? (
          <Button
            className="w-full"
            onClick={onShare}
            disabled={!hasFriends || !hasLineItems}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share with friends
          </Button>
        ) : (
          <>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={onCopy}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={onViewSplit}>
              View split
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
