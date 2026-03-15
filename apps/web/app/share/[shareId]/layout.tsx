"use client";

// Uses bare ConvexProvider (no Clerk auth) because the share page is
// public. Visitors aren't logged in, they just claim items. Mutations
// with assertBillOwner will still reject unauthenticated writes.
// Compare with (auth)/layout.tsx which uses ConvexClerkProvider.
import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/convex";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
