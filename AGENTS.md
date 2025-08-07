# Repository Guidelines

## Project Structure & Module Organization
- `server/`: Colyseus + Express TypeScript backend (`src/index.ts`, rooms, schemas, utils, `adminApi.ts`).
- `client/`: Vue 3 + Vite TypeScript app (`src/views`, `services/colyseus.ts`, `router`, `main.ts`).
- `shared/`: Cross-cutting TypeScript types (`shared/types.ts`).

## Build, Test, and Development Commands
- From repo root:
  - `npm run install:all`: Install client and server dependencies.
  - `npm run dev`: Run server and client in watch mode.
  - `npm run build`: Type-check and build server and client.
- Per package:
  - Server: `cd server && npm run dev | build | start`.
  - Client: `cd client && npm run dev | build | preview`.

## Coding Style & Naming Conventions
- Language: TypeScript (server/client). Indentation: 2 spaces.
- Quotes/Semicolons: double quotes and trailing semicolons (match existing code).
- Naming: `PascalCase` for classes and Vue SFC files (e.g., `Game.vue`), `camelCase` for variables/functions, `kebab-case` for non-component file names when appropriate.
- Keep server state changes server-authoritative; avoid mutating Colyseus state on client.
- No linter is configured; keep changes consistent with surrounding files.

## Testing Guidelines
- No tests yet. Prefer adding:
  - Client: Vitest + Vue Test Utils for views/services.
  - Server: Jest for room logic and schema helpers.
- Conventions: mirror source path and name tests `*.spec.ts` (e.g., `server/src/rooms/GameRoom.spec.ts`).
- CI-friendly: tests must run headless and not require a live server.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (`feat:`, `fix:`, `docs:`) as in history.
- PRs include:
  - Clear description and rationale; link issues (e.g., `Fixes #123`).
  - Screenshots/GIFs for UI changes (`client/src/views/*`).
  - Steps to reproduce and test notes.
  - Scope limited to one logical change; update README/QUICKSTART if behavior changes.

## Security & Configuration Tips
- Server port via `PORT` (default 3000). Monitor at `/colyseus`, REST at `/api`.
- Client WebSocket URL is set in `client/src/services/colyseus.ts`; consider env (`VITE_WS_URL`) for deployments.
- CORS is enabled; restrict origins in production.
