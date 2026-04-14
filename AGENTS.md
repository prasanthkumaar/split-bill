# Split Bill

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Convex (backend, real-time queries/mutations)
- Clerk (auth, proxy.ts for route protection)
- TanStack React Query (for REST API calls only, not Convex)
- Zod v4 (validation), t3-env (env var validation)
- shadcn/ui via `@workspace/ui`

## Code Style

- Prettier enforced: double quotes, no semicolons, 2-space indent, trailing commas (es5)
- `import type` for type-only imports
- Prefer combined Convex queries per page over multiple chained queries with `"skip"`
- React Query for REST/fetch calls only, not Convex
- No `useMemo` unless computation is non-trivial or prevents cascading recalculations
- Hooks in `_hooks/` colocated with the page that uses them
- Providers in `providers/` at app root

## Testing

- Use `agent-browser` CLI for visual verification
- Dev credentials (Clerk test mode): `test+clerk_test@example.com` / OTP: `424242`
- Run: `npm run test:e2e`
- OCR test (costs API credits): `npm run test:ocr`
