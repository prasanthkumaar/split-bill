import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertBillOwner } from "./utils/access";

export const list = query({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("friends")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();
  },
});

export const add = mutation({
  args: {
    billId: v.id("bills"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await assertBillOwner(ctx, args.billId);
    return await ctx.db.insert("friends", args);
  },
});

export const remove = mutation({
  args: { id: v.id("friends") },
  handler: async (ctx, args) => {
    const friend = await ctx.db.get(args.id);
    if (!friend) throw new Error("Friend not found");
    await assertBillOwner(ctx, friend.billId);
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_friend", (q) => q.eq("friendId", args.id))
      .collect();
    for (const c of claims) await ctx.db.delete(c._id);
    await ctx.db.delete(args.id);
  },
});
