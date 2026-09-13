# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the TypeScript implementation:
  - `cli.ts` is the executable entry point and process/error handling.
  - `args.ts` parses CLI options and provides help text.
  - `converter.ts` handles file paths, UTF-8 I/O, and conversion orchestration.
  - `markdown.ts` configures `marked`, HTML escaping, URL safety, and embedded CSS.
  - `watcher.ts` implements debounced `--watch` behavior.
- `test/cli.test.mjs` contains Node.js integration and behavior tests.
- `dist/` is generated build output; do not edit it manually.
- `README.md` documents user-facing installation and CLI usage.

## Build, Test, and Development Commands

```bash
npm install                 # Install dependencies
npm run build               # Compile src/ to dist/
npm test                    # Build, then run all tests
npm start -- input.md       # Run the compiled CLI
npm link                    # Register md2html globally for local testing
```

Use `node dist/cli.js input.md -o output.html` when testing without a global link.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, semicolons, and double-quoted strings to match the existing code. Keep ESM imports with explicit `.js` extensions. Use `camelCase` for functions and variables, `PascalCase` for interfaces/classes, and descriptive file names such as `converter.ts`. No formatter or linter is configured; preserve the surrounding style and run `npm run build` after edits.

## Testing Guidelines

Tests use Node’s built-in `node:test` and `node:assert/strict`; test files use the `*.test.mjs` pattern. Cover CLI parsing, default output naming, Markdown syntax, generated HTML/CSS, error cases, unsafe markup/URLs, and watch-mode updates. Run `npm test` before submitting changes. Tests should use temporary directories and clean up all generated files.

## Commit & Pull Request Guidelines

No Git executable or commit history is available in this workspace, so no existing convention can be verified. Use short, imperative messages such as `feat: support custom output paths` or `fix: debounce watch conversions`. Pull requests should explain behavior changes, list validation commands, and include CLI examples when relevant. Update `README.md` for user-visible options and keep `package-lock.json` synchronized with dependency changes.

## Security & Configuration Tips

Keep raw HTML escaping and unsafe URL-protocol handling enabled. Add dependencies only when necessary, and do not hand-edit generated `dist/` files or commit `node_modules/`.
