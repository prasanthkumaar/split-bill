import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const getShareSession = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const bill = await ctx.db
      .query("bills")
      .withIndex("by_shareId", (q) => q.eq("shareId", args.shareId))
      .unique()

    if (!bill) {
      return null
    }

    const [lineItems, friends, claims, receiptUrl] = await Promise.all([
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

    return { bill, lineItems, friends, claims, receiptUrl }
  },
})

export const setClaimers = mutation({
  args: {
    billId: v.id("bills"),
    lineItemId: v.id("lineItems"),
    unitIndex: v.number(),
    friendIds: v.array(v.id("friends")),
  },
  handler: async (ctx, args) => {
    const validFriends = await ctx.db
      .query("friends")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect()
    const validFriendIds = new Set(validFriends.map((friend) => friend._id))
    for (const friendId of args.friendIds) {
      if (!validFriendIds.has(friendId)) {
        throw new Error("Invalid friendId for this bill")
      }
    }

    const existing = await ctx.db
      .query("claims")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect()

    const relevant = existing.filter(
      (claim) =>
        claim.lineItemId === args.lineItemId && claim.unitIndex === args.unitIndex
    )

    for (const claim of relevant) {
      if (!args.friendIds.includes(claim.friendId)) {
        await ctx.db.delete(claim._id)
      }
    }

    const existingFriendIds = new Set(relevant.map((claim) => claim.friendId))
    for (const friendId of args.friendIds) {
      if (!existingFriendIds.has(friendId)) {
        await ctx.db.insert("claims", {
          billId: args.billId,
          friendId,
          lineItemId: args.lineItemId,
          unitIndex: args.unitIndex,
        })
      }
    }
  },
})
