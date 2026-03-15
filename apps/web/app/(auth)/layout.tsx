"use client";

// Uses ConvexClerkProvider (Convex + Clerk auth) because all routes
// under (auth)/ require a logged-in user. Compare with share/layout.tsx
// which uses bare ConvexProvider since the share page is public.
import { ConvexClerkProvider } from "@/providers/convex-clerk-provider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexClerkProvider>{children}</ConvexClerkProvider>;
}
