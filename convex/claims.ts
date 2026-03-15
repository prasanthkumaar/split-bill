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

export const toggle = mutation({
  args: {
    billId: v.id("bills"),
    friendId: v.id("friends"),
    lineItemId: v.id("lineItems"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("claims")
      .withIndex("by_friend_and_item", (q) =>
        q.eq("friendId", args.friendId).eq("lineItemId", args.lineItemId)
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
      });
    }
  },
});
