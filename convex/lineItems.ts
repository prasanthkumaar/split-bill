import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertBillOwner } from "./utils/access";

export const list = query({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lineItems")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();
  },
});

export const add = mutation({
  args: {
    billId: v.id("bills"),
    name: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
  },
  handler: async (ctx, args) => {
    await assertBillOwner(ctx, args.billId);
    return await ctx.db.insert("lineItems", args);
  },
});

export const replaceAll = mutation({
  args: {
    billId: v.id("bills"),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertBillOwner(ctx, args.billId);
    const existing = await ctx.db
        .query("lineItems")
        .withIndex("by_bill", (q) => q.eq("billId", args.billId))
        .collect();
      for (const item of existing) {
        const claims = await ctx.db
          .query("claims")
          .withIndex("by_lineItem", (q) => q.eq("lineItemId", item._id))
          .collect();
        for (const c of claims) await ctx.db.delete(c._id);
        await ctx.db.delete(item._id);
    }
    for (const item of args.items) {
      await ctx.db.insert("lineItems", {
        billId: args.billId,
        ...item,
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("lineItems"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");
    await assertBillOwner(ctx, item.billId);
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("lineItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");
    await assertBillOwner(ctx, item.billId);
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_lineItem", (q) => q.eq("lineItemId", args.id))
      .collect();
    for (const c of claims) await ctx.db.delete(c._id);
    await ctx.db.delete(args.id);
  },
});
