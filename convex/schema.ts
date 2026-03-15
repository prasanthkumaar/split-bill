import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const BILL_STATUSES = ["editing", "shared", "settled"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export default defineSchema({
  bills: defineTable({
    ownerId: v.string(),
    name: v.string(),
    imageId: v.optional(v.id("_storage")),
    tax: v.number(),
    serviceCharge: v.number(),
    shareId: v.string(),
    status: v.union(
      ...BILL_STATUSES.map((s) => v.literal(s))
    ),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_shareId", ["shareId"]),

  lineItems: defineTable({
    billId: v.id("bills"),
    name: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
  }).index("by_bill", ["billId"]),

  friends: defineTable({
    billId: v.id("bills"),
    name: v.string(),
  }).index("by_bill", ["billId"]),

  claims: defineTable({
    billId: v.id("bills"),
    friendId: v.id("friends"),
    lineItemId: v.id("lineItems"),
    unitIndex: v.number(),
  })
    .index("by_bill", ["billId"])
    .index("by_friend", ["friendId"])
    .index("by_lineItem", ["lineItemId"])
    .index("by_friend_item_unit", ["friendId", "lineItemId", "unitIndex"]),
});
