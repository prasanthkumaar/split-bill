import { v } from "convex/values"
import type { UserIdentity } from "convex/server"
import { mutation, query } from "./_generated/server"
import { nanoid } from "./utils/nanoid"
import { assertBillOwner } from "./utils/access"
import { BILL_STATUSES } from "./schema"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    return await ctx.db
      .query("bills")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect()
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const billId = await ctx.db.insert("bills", {
      ownerId: identity.subject,
      name: args.name,
      imageId: args.imageId,
      tax: 0,
      serviceCharge: 0,
      shareId: nanoid(),
      status: "editing",
      createdAt: Date.now(),
    })
    await ctx.db.insert("friends", {
      billId,
      name: getOwnerParticipantName(identity),
      userId: identity.subject,
    })
    return billId
  },
})

export const update = mutation({
  args: {
    id: v.id("bills"),
    name: v.optional(v.string()),
    tax: v.optional(v.number()),
    serviceCharge: v.optional(v.number()),
    imageId: v.optional(v.id("_storage")),
    status: v.optional(v.union(...BILL_STATUSES.map((s) => v.literal(s)))),
  },
  handler: async (ctx, args) => {
    await assertBillOwner(ctx, args.id)
    if (args.imageId) {
      const meta = await ctx.db.system.get(args.imageId)
      if (meta && meta.size > 10 * 1024 * 1024) {
        await ctx.storage.delete(args.imageId)
        throw new Error("File too large. Maximum size is 10MB.")
      }
    }
    const { id, ...updates } = args
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )
    await ctx.db.patch(id, filtered)
  },
})

export const remove = mutation({
  args: { id: v.id("bills") },
  handler: async (ctx, args) => {
    await assertBillOwner(ctx, args.id)

    const items = await ctx.db
      .query("lineItems")
      .withIndex("by_bill", (q) => q.eq("billId", args.id))
      .collect()
    const friends = await ctx.db
      .query("friends")
      .withIndex("by_bill", (q) => q.eq("billId", args.id))
      .collect()
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_bill", (q) => q.eq("billId", args.id))
      .collect()

    for (const c of claims) await ctx.db.delete(c._id)
    for (const f of friends) await ctx.db.delete(f._id)
    for (const i of items) await ctx.db.delete(i._id)
    await ctx.db.delete(args.id)
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return await ctx.storage.generateUploadUrl()
  },
})

function getOwnerParticipantName(identity: UserIdentity) {
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

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

export const getWithImage = query({
  args: { id: v.id("bills") },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.id)
    if (!bill) return null
    const receiptUrl = bill.imageId
      ? await ctx.storage.getUrl(bill.imageId)
      : null
    return { ...bill, receiptUrl }
  },
})
