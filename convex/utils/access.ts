import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function assertBillOwner(
  ctx: MutationCtx,
  billId: Id<"bills">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const bill = await ctx.db.get(billId);
  if (!bill || bill.ownerId !== identity.subject)
    throw new Error("Not authorised");
}
