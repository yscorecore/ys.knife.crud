# ys.knife.crud

A typed CRUD toolkit for the web. Published as scoped npm packages from a pnpm + TypeScript monorepo.

## Packages

| Name | Path | Status | Description |
| --- | --- | --- | --- |
| [`@ys.knife.crud/core`](./packages/core) | `packages/core` | published | Framework-agnostic CRUD contract, data-source interface and an in-memory implementation. |
| [`@ys.knife.crud/component-elementplus`](./packages/component-elementplus) | `packages/component-elementplus` | published | Vue 3 + element-plus UI components built on top of `core`. Distributed as a Vue plugin + individual components. |
| `@ys.knife.crud/demo` | `packages/demo` | **private, not published** | Vite-powered playground used to validate `component-elementplus` during development. |

## Requirements

- Node.js ≥ 18 (recommended 22 LTS)
- pnpm 9 (`corepack enable` is enough)

## Getting started

```bash
pnpm install
```

## Common scripts

Run from the repo root:

| Script | What it does |
| --- | --- |
| `pnpm build` | Build every published package with `tsup` (ESM + CJS + `.d.ts`). |
| `pnpm test` | Run all unit tests with `vitest`. |
| `pnpm test:watch` | Watch mode for tests. |
| `pnpm typecheck` | Type-check every workspace (`tsc` / `vue-tsc`). |
| `pnpm lint` | Run ESLint over `packages/*/src`. |
| `pnpm clean` | Remove every `dist/` and `node_modules/`. |
| `pnpm changeset` | Record a change for the next release. |
| `pnpm version-packages` | Apply changesets and bump versions. |
| `pnpm release` | Build + publish to npm. |

### Running the demo

```bash
pnpm --filter @ys.knife.crud/demo dev
```

Then open <http://localhost:5173>. The demo depends on the workspace copy of `@ys.knife.crud/component-elementplus` and is marked `private` so it will never be published to npm.

## Release flow

1. `pnpm changeset` — pick affected packages and bump level (`patch` / `minor` / `major`).
2. `pnpm version-packages` — consumes pending changesets and bumps `package.json` versions.
3. `pnpm release` — builds and runs `changeset publish` (requires `NODE_AUTH_TOKEN` set to a publish-capable npm token).

`@ys.knife.crud/demo` is intentionally ignored by Changesets via `.changeset/config.json` and won't appear in release output even if a changeset is added for it.

## Repo layout

```
ys.knife.crud/
├── packages/
│   ├── core/                    @ys.knife.crud/core
│   ├── component-elementplus/   @ys.knife.crud/component-elementplus
│   └── demo/                    @ys.knife.crud/demo (private)
├── .changeset/
├── .github/workflows/ci.yml
├── eslint.config.js
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

## License

MIT.
