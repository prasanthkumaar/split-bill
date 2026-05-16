import type { UserIdentity } from "convex/server"
import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import {
  mutation,
  query,
  type DatabaseReader,
  type MutationCtx,
} from "./_generated/server"

export const getShareSession = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const bill = await getBillByShareId(ctx.db, args.shareId)
    if (!bill) {
      return null
    }

    const identity = await ctx.auth.getUserIdentity()
    const [lineItems, participantRows, claimRows, receiptUrl] =
      await Promise.all([
        ctx.db
          .query("lineItems")
          .withIndex("by_bill", (q) => q.eq("billId", bill._id))
          .collect(),
        ctx.db
          .query("friends")
          .withIndex("by_bill", (q) => q.eq("billId", bill._id))
          .collect(),
        ctx.db
          .query("claims")
          .withIndex("by_bill", (q) => q.eq("billId", bill._id))
          .collect(),
        bill.imageId ? ctx.storage.getUrl(bill.imageId) : null,
      ])

    const participants = participantRows
      .map((participant) => ({
        id: participant._id,
        name: participant.name,
        role: getParticipantRole(participant, bill.ownerId),
        doneAt: participant.doneAt ?? null,
      }))
      .sort((left, right) => {
        const leftIsDone = left.doneAt !== null
        const rightIsDone = right.doneAt !== null

        if (leftIsDone !== rightIsDone) {
          return leftIsDone ? -1 : 1
        }

        if (left.role !== right.role) {
          return left.role === "owner" ? -1 : 1
        }

        return left.name.localeCompare(right.name)
      })

    const claims = claimRows.map((claim) => ({
      lineItemId: claim.lineItemId,
      participantId: claim.friendId,
      unitIndex: claim.unitIndex,
    }))

    return {
      bill,
      lineItems,
      participants,
      claims,
      receiptUrl,
      viewerIsOwner: identity?.subject === bill.ownerId,
    }
  },
})

export const setDone = mutation({
  args: {
    billId: v.id("bills"),
    participantId: v.id("friends"),
    done: v.boolean(),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId)
    if (!participant || participant.billId !== args.billId) {
      throw new Error("Participant not found")
    }

    if (participant.userId) {
      const identity = await ctx.auth.getUserIdentity()
      if (identity?.subject !== participant.userId) {
        throw new Error("Forbidden")
      }
    }

    if (args.done) {
      await ctx.db.patch(args.participantId, { doneAt: Date.now() })
      return
    }

    const { _creationTime, _id, doneAt, ...participantFields } = participant
    await ctx.db.replace(args.participantId, participantFields)
  },
})

export const applyBulkEdit = mutation({
  args: {
    billId: v.id("bills"),
    assignments: v.array(
      v.object({
        lineItemId: v.id("lineItems"),
        participantIds: v.array(v.id("friends")),
        unitIndex: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId)
    const identity = await ctx.auth.getUserIdentity()
    if (!bill || identity?.subject !== bill.ownerId) {
      throw new Error("Not authorised")
    }

    const [lineItems, participants, claims] = await Promise.all([
      ctx.db
        .query("lineItems")
        .withIndex("by_bill", (q) => q.eq("billId", args.billId))
        .collect(),
      ctx.db
        .query("friends")
        .withIndex("by_bill", (q) => q.eq("billId", args.billId))
        .collect(),
      ctx.db
        .query("claims")
        .withIndex("by_bill", (q) => q.eq("billId", args.billId))
        .collect(),
    ])

    const validatedAssignments = validateBulkEditAssignments({
      assignments: args.assignments.map((assignment) => ({
        lineItemId: assignment.lineItemId,
        participantIds: assignment.participantIds,
        unitIndex: assignment.unitIndex,
      })),
      lineItems: lineItems.map((lineItem) => ({
        id: lineItem._id,
        quantity: lineItem.quantity,
      })),
      participantIds: participants.map((participant) => participant._id),
    })

    for (const claim of claims) {
      await ctx.db.delete(claim._id)
    }

    for (const assignment of validatedAssignments) {
      for (const participantId of assignment.participantIds) {
        await ctx.db.insert("claims", {
          billId: args.billId,
          friendId: participantId as Id<"friends">,
          lineItemId: assignment.lineItemId as Id<"lineItems">,
          unitIndex: assignment.unitIndex,
        })
      }
    }
  },
})

export const prepareShareSession = mutation({
  args: { ownerName: v.optional(v.string()), shareId: v.string() },
  handler: async (ctx, args) => {
    const bill = await getBillByShareId(ctx.db, args.shareId)
    if (!bill) {
      return null
    }

    const identity = await ctx.auth.getUserIdentity()
    const ownerIdentity = identity?.subject === bill.ownerId ? identity : null
    const ownerParticipantId = await ensureOwnerParticipant(
      ctx,
      bill,
      ownerIdentity,
      args.ownerName
    )

    return {
      currentParticipantId: ownerIdentity ? ownerParticipantId : null,
    }
  },
})

export const setClaimers = mutation({
  args: {
    billId: v.id("bills"),
    lineItemId: v.id("lineItems"),
    unitIndex: v.number(),
    participantIds: v.array(v.id("friends")),
  },
  handler: async (ctx, args) => {
    const validFriends = await ctx.db
      .query("friends")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect()
    const participantIdsForBill = new Set(
      validFriends.map((participant) => participant._id)
    )
    for (const participantId of args.participantIds) {
      if (!participantIdsForBill.has(participantId)) {
        throw new Error("Participant not found")
      }
    }

    const existingClaims = await ctx.db
      .query("claims")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect()

    const relevantClaims = existingClaims.filter(
      (claim) =>
        claim.lineItemId === args.lineItemId &&
        claim.unitIndex === args.unitIndex
    )

    for (const claim of relevantClaims) {
      if (!args.participantIds.includes(claim.friendId)) {
        await ctx.db.delete(claim._id)
      }
    }

    const existingParticipantIds = new Set(
      relevantClaims.map((claim) => claim.friendId)
    )
    for (const participantId of args.participantIds) {
      if (!existingParticipantIds.has(participantId)) {
        await ctx.db.insert("claims", {
          billId: args.billId,
          friendId: participantId,
          lineItemId: args.lineItemId,
          unitIndex: args.unitIndex,
        })
      }
    }
  },
})

async function getBillByShareId(db: DatabaseReader, shareId: string) {
  return await db
    .query("bills")
    .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
    .unique()
}

async function ensureOwnerParticipant(
  ctx: MutationCtx,
  bill: Doc<"bills">,
  ownerIdentity: UserIdentity | null,
  ownerNameFromClient?: string
): Promise<Id<"friends">> {
  const participants = await ctx.db
    .query("friends")
    .withIndex("by_bill", (q) => q.eq("billId", bill._id))
    .collect()

  const existingOwner = participants.find(
    (participant) => participant.userId === bill.ownerId
  )
  const ownerName = ownerIdentity
    ? getOwnerParticipantName(ownerIdentity, ownerNameFromClient)
    : null

  if (existingOwner) {
    const updates: Partial<Pick<Doc<"friends">, "name" | "role">> = {}

    if (ownerName !== null && existingOwner.name !== ownerName) {
      updates.name = ownerName
    }

    if (existingOwner.role !== "owner") {
      updates.role = "owner"
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(existingOwner._id, updates)
    }

    return existingOwner._id
  }

  return await ctx.db.insert("friends", {
    billId: bill._id,
    name: ownerName ?? "Owner",
    role: "owner",
    userId: bill.ownerId,
  })
}

function getParticipantRole(participant: Doc<"friends">, ownerId: string) {
  return (
    participant.role ?? (participant.userId === ownerId ? "owner" : "guest")
  )
}

function getOwnerParticipantName(identity: UserIdentity, ownerName?: string) {
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

type BulkEditAssignment = {
  lineItemId: string
  participantIds: string[]
  unitIndex: number
}

type BulkEditLineItem = {
  id: string
  quantity: number
}

export function validateBulkEditAssignments({
  assignments,
  lineItems,
  participantIds,
}: {
  assignments: BulkEditAssignment[]
  lineItems: BulkEditLineItem[]
  participantIds: string[]
}) {
  const allowedParticipantIds = new Set(participantIds)
  const requiredUnits = lineItems.flatMap((lineItem) =>
    Array.from({ length: lineItem.quantity }, (_, unitIndex) => ({
      key: getBulkEditUnitKey(lineItem.id, unitIndex),
      lineItemId: lineItem.id,
      unitIndex,
    }))
  )
  const requiredUnitByKey = new Map(
    requiredUnits.map((unit) => [unit.key, unit])
  )
  const assignmentByKey = new Map<string, BulkEditAssignment>()

  for (const assignment of assignments) {
    const unitKey = getBulkEditUnitKey(
      assignment.lineItemId,
      assignment.unitIndex
    )
    if (!requiredUnitByKey.has(unitKey)) {
      throw new Error(
        `Bulk edit referenced an unknown unit: ${assignment.lineItemId}:${assignment.unitIndex}`
      )
    }

    if (assignmentByKey.has(unitKey)) {
      throw new Error(
        `Bulk edit repeated a unit: ${assignment.lineItemId}:${assignment.unitIndex}`
      )
    }

    const seenParticipantIds = new Set<string>()
    for (const participantId of assignment.participantIds) {
      if (!allowedParticipantIds.has(participantId)) {
        throw new Error("Bulk edit referenced an unknown participant")
      }

      if (seenParticipantIds.has(participantId)) {
        throw new Error("Bulk edit repeated a participant for a unit")
      }

      seenParticipantIds.add(participantId)
    }

    assignmentByKey.set(unitKey, assignment)
  }

  for (const unit of requiredUnits) {
    if (!assignmentByKey.has(unit.key)) {
      throw new Error(
        `Bulk edit omitted a unit: ${unit.lineItemId}:${unit.unitIndex}`
      )
    }
  }

  return requiredUnits.map((unit) => assignmentByKey.get(unit.key)!)
}

function getBulkEditUnitKey(lineItemId: string, unitIndex: number) {
  return `${lineItemId}:${unitIndex}`
}
