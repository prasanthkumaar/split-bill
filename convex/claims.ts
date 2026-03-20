import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("claims")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();
  },
});

export const setClaimers = mutation({
  args: {
    billId: v.id("bills"),
    lineItemId: v.id("lineItems"),
    unitIndex: v.number(),
    friendIds: v.array(v.id("friends")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("claims")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();
    const relevant = existing.filter(
      (c) =>
        c.lineItemId === args.lineItemId && c.unitIndex === args.unitIndex
    );

    // Delete claims not in the new set
    for (const claim of relevant) {
      if (!args.friendIds.includes(claim.friendId)) {
        await ctx.db.delete(claim._id);
      }
    }

    // Add claims not already present
    const existingFriendIds = new Set(relevant.map((c) => c.friendId));
    for (const friendId of args.friendIds) {
      if (!existingFriendIds.has(friendId)) {
        await ctx.db.insert("claims", {
          billId: args.billId,
          friendId,
          lineItemId: args.lineItemId,
          unitIndex: args.unitIndex,
        });
      }
    }
  },
});

export const toggle = mutation({
  args: {
    billId: v.id("bills"),
    friendId: v.id("friends"),
    lineItemId: v.id("lineItems"),
    unitIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("claims")
      .withIndex("by_friend_item_unit", (q) =>
        q
          .eq("friendId", args.friendId)
          .eq("lineItemId", args.lineItemId)
          .eq("unitIndex", args.unitIndex)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return null;
    } else {
      return await ctx.db.insert("claims", {
        billId: args.billId,
        friendId: args.friendId,
        lineItemId: args.lineItemId,
        unitIndex: args.unitIndex,
      });
    }
  },
});
