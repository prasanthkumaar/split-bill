import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("claims")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect()
  },
})
