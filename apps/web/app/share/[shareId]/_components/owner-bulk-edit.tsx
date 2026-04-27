"use client"

import { useRef, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Doc, Id } from "@convex/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import { Textarea } from "@workspace/ui/components/textarea"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
import { generateBulkEdit } from "../actions"
import type { BulkEditResult } from "../schema"

type OwnerBulkEditProps = {
  billId: Id<"bills">
  lineItems: Doc<"lineItems">[]
  participants: {
    id: Id<"friends">
    name: string
    role: "owner" | "guest"
  }[]
  currentAssignments: {
    lineItemId: Id<"lineItems">
    unitIndex: number
    participantNames: string[]
  }[]
}

export function OwnerBulkEdit({
  billId,
  lineItems,
  participants,
  currentAssignments,
}: OwnerBulkEditProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const applyBulkEdit = useMutation(api.sharing.applyBulkEdit)

  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<BulkEditResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const requestVersionRef = useRef(0)

  const resetComposer = () => {
    requestVersionRef.current += 1
    setError(null)
    setReview(null)
    setPrompt("")
    setIsGenerating(false)
    setIsApplying(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetComposer()
    }
  }

  const handleGenerate = async () => {
    if (prompt.trim().length === 0 || isGenerating) {
      return
    }

    const requestVersion = requestVersionRef.current

    try {
      setIsGenerating(true)
      setError(null)
      const generatedReview = await generateBulkEdit({
        instructions: prompt,
        participants: participants.map((participant) => ({
          id: participant.id,
          name: participant.name,
        })),
        lineItems: lineItems.map((lineItem) => ({
          id: lineItem._id,
          name: lineItem.name,
          quantity: lineItem.quantity,
          unitPrice: lineItem.unitPrice,
        })),
        currentAssignments: currentAssignments.map((assignment) => ({
          lineItemId: assignment.lineItemId,
          unitIndex: assignment.unitIndex,
          participantNames: assignment.participantNames,
        })),
      })

      if (requestVersionRef.current !== requestVersion) {
        return
      }

      setReview(generatedReview)
    } catch (nextError) {
      if (requestVersionRef.current !== requestVersion) {
        return
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to generate a bulk edit"
      )
    } finally {
      if (requestVersionRef.current === requestVersion) {
        setIsGenerating(false)
      }
    }
  }

  const handleApply = async () => {
    if (!review || isApplying) {
      return
    }

    const requestVersion = requestVersionRef.current

    try {
      setIsApplying(true)
      setError(null)
      await applyBulkEdit({
        billId,
        assignments: review.assignments.map((assignment) => ({
          lineItemId: assignment.lineItemId as Id<"lineItems">,
          participantIds: assignment.participantIds as Id<"friends">[],
          unitIndex: assignment.unitIndex,
        })),
      })

      if (requestVersionRef.current !== requestVersion) {
        return
      }

      handleOpenChange(false)
    } catch (nextError) {
      if (requestVersionRef.current !== requestVersion) {
        return
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to apply the reviewed split"
      )
    } finally {
      if (requestVersionRef.current === requestVersion) {
        setIsApplying(false)
      }
    }
  }

  const composeContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Describe how you want the bill split. The review step will show every
          unit before anything is applied.
        </p>
        <Textarea
          data-testid="bulk-edit-prompt"
          placeholder="Example: Put the laksa on Bob, split the teas between Alice and me."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </div>

      <div className="divide-y overflow-hidden rounded-lg border">
        {BULK_EDIT_SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="ghost"
            size="lg"
            className="h-auto w-full justify-start rounded-none border-0 px-4 py-4 text-left whitespace-normal shadow-none"
            onClick={() => setPrompt(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )

  const reviewContent = review ? (
    <div className="space-y-4">
      <div className="space-y-2">
        {review.assignments.map((assignment) => (
          <div
            key={`${assignment.lineItemId}-${assignment.unitIndex}`}
            data-testid="bulk-edit-review-item"
            className="rounded-lg border px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{assignment.lineItemName}</div>
                <div className="text-sm text-muted-foreground">
                  Unit {assignment.unitIndex + 1}
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="font-medium">
                  ${assignment.unitPrice.toFixed(2)}
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {assignment.participantNames.length > 0 ? (
                    assignment.participantNames.map((participantName) => (
                      <Badge
                        key={participantName}
                        variant="secondary"
                        data-testid="bulk-edit-review-claimer"
                      >
                        {participantName}
                      </Badge>
                    ))
                  ) : (
                    <Badge
                      variant="outline"
                      data-testid="bulk-edit-review-claimer"
                    >
                      Unassigned
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  ) : null

  const mobileFooter = review ? (
    <>
      <Button
        data-testid="bulk-edit-apply"
        size="lg"
        className="w-full"
        onClick={handleApply}
        disabled={isApplying}
      >
        {isApplying ? "Applying..." : "Apply split"}
      </Button>
      <Button
        data-testid="bulk-edit-back"
        variant="ghost"
        size="lg"
        className="w-full"
        onClick={() => setReview(null)}
        disabled={isApplying}
      >
        Back
      </Button>
    </>
  ) : (
    <>
      <Button
        data-testid="bulk-edit-generate"
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={prompt.trim().length === 0 || isGenerating}
      >
        {isGenerating ? "Generating..." : "Generate split"}
      </Button>
      <Button
        variant="ghost"
        size="lg"
        className="w-full"
        onClick={() => handleOpenChange(false)}
        disabled={isGenerating}
      >
        Cancel
      </Button>
    </>
  )

  const desktopFooter = review ? (
    <>
      <Button
        data-testid="bulk-edit-back"
        variant="ghost"
        size="lg"
        className="min-w-32"
        onClick={() => setReview(null)}
        disabled={isApplying}
      >
        Back
      </Button>
      <Button
        data-testid="bulk-edit-apply"
        size="lg"
        className="min-w-32"
        onClick={handleApply}
        disabled={isApplying}
      >
        {isApplying ? "Applying..." : "Apply split"}
      </Button>
    </>
  ) : (
    <>
      <Button
        variant="ghost"
        size="lg"
        className="min-w-32"
        onClick={() => handleOpenChange(false)}
        disabled={isGenerating}
      >
        Cancel
      </Button>
      <Button
        data-testid="bulk-edit-generate"
        size="lg"
        className="min-w-32"
        onClick={handleGenerate}
        disabled={prompt.trim().length === 0 || isGenerating}
      >
        {isGenerating ? "Generating..." : "Generate split"}
      </Button>
    </>
  )

  return (
    <>
      <Button
        data-testid="bulk-edit-trigger"
        className="w-fit shrink-0"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Bulk edit
      </Button>

      {isDesktop ? (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="flex max-h-[calc(100vh-4rem)] flex-col sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {review ? "Review bulk edit" : "Compose bulk edit"}
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {review ? reviewContent : composeContent}
            </div>
            <div className="flex justify-end gap-1">{desktopFooter}</div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent aria-describedby={undefined}>
            <DrawerHeader>
              <DrawerTitle>
                {review ? "Review bulk edit" : "Compose bulk edit"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">
              {review ? reviewContent : composeContent}
            </div>
            <DrawerFooter className="gap-1 pb-8">{mobileFooter}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}

const BULK_EDIT_SUGGESTIONS = [
  "Split all the food equally",
  "Split all the food and drinks equally",
]
