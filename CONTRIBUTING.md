# Contributing

Thanks for your interest in Split Bill. This repo is open to issues and pull requests.

## Before you start

1. Search [existing issues](https://github.com/prasanthkumaar/split-bill/issues) to avoid duplicates.
2. For larger changes, open an issue first so we can align on scope.

## Development setup

See the [README](README.md) for prerequisites and local setup.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep changes focused on one concern.
3. Run checks before opening a PR:

```bash
npm run typecheck
npm run lint
npm run test:e2e
```

4. Fill out the PR template and describe how you tested the change.

Receipt OCR tests (`npm run test:ocr`) call external APIs and cost credits — only run them when your change touches receipt parsing.

## Code style

Follow existing patterns in the repo. See [AGENTS.md](AGENTS.md) for stack and conventions.

## Questions

Open a [GitHub issue](https://github.com/prasanthkumaar/split-bill/issues/new/choose) if you get stuck.
