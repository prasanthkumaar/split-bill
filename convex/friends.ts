import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { assertBillOwner } from "./utils/access"

export const list = query({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    const friends = await ctx.db
      .query("friends")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect()

    return friends.sort((left, right) => {
      const leftRole = left.role ?? "guest"
      const rightRole = right.role ?? "guest"

      if (leftRole !== rightRole) {
        return leftRole === "owner" ? -1 : 1
      }

      return left.name.localeCompare(right.name)
    })
  },
})

export const add = mutation({
  args: {
    billId: v.id("bills"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await assertBillOwner(ctx, args.billId)
    return await ctx.db.insert("friends", {
      ...args,
      role: "guest",
    })
  },
})

export const remove = mutation({
  args: { id: v.id("friends") },
  handler: async (ctx, args) => {
    const friend = await ctx.db.get(args.id)
    if (!friend) throw new Error("Friend not found")
    const bill = await assertBillOwner(ctx, friend.billId)
    const role =
      friend.role ?? (friend.userId === bill.ownerId ? "owner" : "guest")
    if (role === "owner") {
      throw new Error("Owner participant cannot be removed")
    }
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_friend", (q) => q.eq("friendId", args.id))
      .collect()
    for (const c of claims) await ctx.db.delete(c._id)
    await ctx.db.delete(args.id)
  },
})
