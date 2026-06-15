# Split Bill

Upload receipts, split items with friends, and track who owes what — in real time.

Live app: [split-bill-five-murex.vercel.app](https://split-bill-five-murex.vercel.app)

## Features

- Create bills and upload receipt photos
- OCR parsing of line items (Anthropic)
- Share a link so friends can claim items and mark payments
- Real-time updates via Convex

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Convex (backend)
- Clerk (auth)
- shadcn/ui via `@workspace/ui`

See [AGENTS.md](AGENTS.md) for coding conventions.

## Prerequisites

- Node.js 20+
- npm 10+
- Convex, Clerk, and Anthropic accounts for local development

## Local development

```bash
npm install
```

Copy environment variables into `apps/web/.env.local`. Required keys are listed in `apps/web/.env.schema`:

- `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_FRONTEND_API_URL`
- `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`

Start Convex and the web app:

```bash
npx convex dev          # in one terminal
npm run dev             # in another
```

The app runs at [http://localhost:3000](http://localhost:3000).

Clerk test mode credentials (when configured): `test+clerk_test@example.com` / OTP `424242`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev servers (Turbo) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright happy-path tests |
| `npm run test:ocr` | Receipt OCR test (uses API credits) |

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
