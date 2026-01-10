# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands & Development Workflow

### Install dependencies

```bash
npm install
```

### Frontend development (static site)

Serves the static frontend from the project root using `live-server` on port 3000.

```bash
npm run dev
```

### Backend API server

Express server in `src/server.js` serves both the API under `/api/*` and the static frontend (mapping URLs like `/markets` to `markets.html`).

- Run once (no auto-reload):

  ```bash
  npm run server
  ```

- Run in watch mode with `nodemon` during development:

  ```bash
  npm run server:dev
  ```

By default the server listens on `PORT` from the environment or `5001`.

### Linting & formatting

- Format HTML/CSS/JS/Markdown/JSON with Prettier:

  ```bash
  npm run format
  ```

- Lint JavaScript (and auto-fix) with ESLint:

  ```bash
  npm run lint
  ```

### Ad‑hoc scripts

There is no project-wide automated test runner defined. For targeted checks, run Node scripts directly, for example:

```bash
node test-login.js
```

This script verifies connectivity to the Postgres database and inspects sample users.

## High-level Architecture

### Overview

This repository is a Node.js/Express application that serves a static marketing/landing frontend and a JSON API for a crypto-themed trading dashboard. The backend handles authentication, account balances, portfolios, testimonies, and background price updates against a Postgres database.

Top-level structure:

- Static frontend: HTML/CSS/JS files at the project root (`index.html`, `dashboard.html`, `admin.html`, etc.), with supporting assets under `css/` and `js/`.
- Backend server and API: `src/server.js` plus route modules under `src/routes/`.
- Database access and schema bootstrap: `src/db/`.
- Background job for portfolio valuation: `src/jobs/`.
- Server-Sent Events (SSE) broadcaster for realtime updates: `src/sse/`.

### Frontend

- The static frontend consists of individual HTML pages (e.g. `index.html`, `login.html`, `dashboard.html`, `admin.html`, `markets.html`) with page-specific scripts under `js/` (`dashboard.js`, `auth.js`, `transactions.js`, `markets.js`, `admin.js`, etc.).
- `npm run dev` serves these directly with `live-server` from the project root (port 3000). In contrast, `src/server.js` also serves the same static files while layering the API under `/api/*`.
- `src/server.js` contains custom routing logic so that requests like `/markets` or nested paths such as `/settings/profile` are resolved to the appropriate `.html` file when it exists, falling back to `index.html` if needed. This enables simple client-side navigation without a SPA framework.

When modifying or adding pages, prefer to:

- Place new HTML files at the project root (e.g. `foo.html`).
- Add any page-specific JS to `js/<page>.js` and wire it from the new HTML.
- Rely on the server’s path-to-HTML resolution (no extra Express route needed for purely static pages).

### Backend server & routing

`src/server.js` is the main entry point for the backend:

- Loads environment configuration (`dotenv`), enables CORS, and parses JSON request bodies.
- Runs `ensureSchema()` from `src/db/init.js` on startup to create/upgrade tables (e.g. `transactions`, `portfolio`, `testimonies`, `admin_audit`, and `users.portfolio_value`).
- Starts the background price updater job from `src/jobs/priceUpdater.js` (default daily interval).
- Serves static assets from the project root and implements the HTML fallback routing described above.
- Exposes a lightweight health check at `GET /api/health` that does not depend on the database.
- Mounts feature-specific routers under `/api/*`:
  - `/api/auth` — user signup/login and profile retrieval.
  - `/api/contact` — contact form handling (see `src/routes/contact.js`).
  - `/api/withdrawals` — authenticated withdrawal creation and listing.
  - `/api/deposit` — deposit address lookup for supported currencies.
  - `/api/transactions` — authenticated transaction listing and convenience deposit/withdraw endpoints.
  - `/api/admin` — administrative operations (requires `x-admin-key`).
  - `/api/updates` — SSE stream endpoint.
  - `/api/prices` — CoinGecko-backed price lookup with caching.
  - `/api/testimonies` and `/api/testimonies-generate` — testimonial CRUD and generation utilities.

Authentication & authorization:

- `src/middleware/auth.js` implements:
  - `verifyToken` — reads a `Bearer <jwt>` token from the `Authorization` header, validates it with `JWT_SECRET`, and attaches `req.userId`/`req.userEmail`.
  - `verifyAdmin` — checks `x-admin-key` against `ADMIN_API_KEY` for admin-only operations.
- Most user-facing data routes (e.g. `/api/transactions`, `/api/withdrawals`, `/api/auth/me`) are protected with `verifyToken`.
- Sensitive admin endpoints (balance credits, portfolio adjustments, testimony management) are protected either by `verifyAdmin` or explicit `x-admin-key` checks inside the route module (see `src/routes/admin.js` and `src/routes/testimonies.js`).

When adding new routes:

- Place them under `src/routes/` and mount them in `src/server.js` under `/api/<feature>`.
- Choose between `verifyToken` and `verifyAdmin` based on whether they are user- or admin-facing.
- Prefer using the shared `db` module for all Postgres access.

### Database access & schema management

Database integration is centralized in `src/db/`:

- `src/db/index.js` wraps a `pg.Pool` configured with `DATABASE_URL` and exports `query(text, params)` and the underlying `pool`.
- `src/db/init.js` exposes `ensureSchema()`, which:
  - Creates or updates the `admin_audit`, `transactions`, `portfolio`, and `testimonies` tables.
  - Ensures `users` has a `portfolio_value` column.
  - Seeds a small set of initial testimonies if the `testimonies` table is empty.

Notable usage patterns:

- Simple, stateless queries throughout routes use `db.query(...)`.
- Multi-step operations that require transactions (e.g. admin crediting, portfolio adjustments) obtain a dedicated client via `db.pool.connect()`, explicitly `BEGIN`/`COMMIT`/`ROLLBACK`, then `release()`.
- Many routes are built to fail gracefully: for example, `/api/transactions` returns an empty array instead of a hard error if the `transactions` table is missing.

If you extend the schema (e.g. add new per-user tables or columns), prefer updating `ensureSchema()` so the application can self-bootstrap on new environments.

### Background pricing job & portfolio valuation

`src/jobs/priceUpdater.js` periodically updates user portfolio valuations in USD:

- Fetches crypto prices (BTC, ETH, USDT, USDC, XRP, ADA) from CoinGecko via `fetchPrices()`.
- Reads all portfolio rows from the `portfolio` table, multiplies balances by current prices, and computes a `usd_value` per row.
- Updates both `portfolio.usd_value` and `users.portfolio_value` per user.
- `startPriceUpdater()` is invoked during server startup with a default interval of 24 hours and also runs once immediately via `setImmediate`.

If you change which assets are tracked or how valuation works, align the following:

- The `CG_MAP` symbol/id mapping.
- The `portfolio` table columns and the loop over balances in `updatePortfolioValues()`.
- Any frontend displays relying on `portfolio_value` or per-asset balances.

### Price API & caching

`src/routes/prices.js` exposes `GET /api/prices` with a `symbols` query parameter (comma-separated symbols like `BTC,ETH,USDT` or direct CoinGecko IDs):

- Maintains an in-memory cache (`priceCache`) with a TTL (`CACHE_TTL`) and a minimum TTL used for fallback when external requests fail.
- Serializes CoinGecko requests using `isFetching`/`fetchPromise` to avoid rate-limit issues.
- Returns cached data with various `X-Cache` headers (`HIT`, `MISS`, `STALE`, `STALE-FALLBACK`, `ERROR-FALLBACK`, etc.) depending on cache behavior.

Use this route from the frontend rather than calling CoinGecko directly to benefit from caching and error handling.

### Realtime updates via SSE

Server-Sent Events are handled via `src/sse/broadcaster.js` and the `/api/updates` route:

- `src/sse/broadcaster.js` tracks connected clients per `userId` in memory and exposes:
  - `subscribe(userId, res)` — registers an HTTP response as an SSE stream.
  - `emit(userId, event, payload)` — sends JSON messages to all subscribers for that user.
- `src/routes/updates.js` defines `GET /api/updates/stream?userId=...` which calls `subscribe`.
- Admin actions such as credits or balance adjustments (`src/routes/admin.js`) call `sse.emit(...)` to push `profile_update` events to connected dashboards.

When adding new realtime features, emit per-user events through this mechanism instead of creating separate SSE infrastructure.

### Deposits, withdrawals, and transactions

Key routes:

- `src/routes/deposit.js` — read-only endpoint that returns deposit addresses based on environment variables (`DEPOSIT_ADDR_BTC`, `DEPOSIT_ADDR_ETH`, `DEPOSIT_ADDR_USDT`, `DEPOSIT_ADDR_USDC`), falling back to hardcoded test values.
- `src/routes/withdrawals.js` — authenticated creation and listing of withdrawals, including basic validation of amount, supported crypto symbols, and a simple address format check.
- `src/routes/transactions.js` — authenticated listing of recent transactions and stub-friendly deposit/withdraw endpoints that attempt to persist data but will return successful stub responses even if DB tables are missing.

### Testimonies & content generation

Testimonials are stored in the `testimonies` table and surfaced via:

- `src/routes/testimonies.js` — public fetching and admin-only CRUD for testimonies, including a `featured` filter.
- `src/routes/testimonies-generate.js` — utility endpoints that generate realistic-looking testimonial content from templates and either return it (`GET /generate`) or persist a batch under admin control (`POST /generate-batch`).

These routes are used to populate frontend sections like landing-page testimonials and floating testimonies components.

## Environment & Configuration

The application expects a `.env` file (or equivalent environment variables) providing:

- `DATABASE_URL` — Postgres connection string consumed by `src/db/index.js` and utility scripts like `test-login.js`.
- `JWT_SECRET` — secret key for signing and verifying JWT tokens in `src/routes/auth.js` and `src/middleware/auth.js`.
- `ADMIN_API_KEY` — value checked in admin routes via the `x-admin-key` header.
- Optional deposit addresses:
  - `DEPOSIT_ADDR_BTC`, `DEPOSIT_ADDR_ETH`, `DEPOSIT_ADDR_USDT`, `DEPOSIT_ADDR_USDC`.
- `PORT` — optional override for the Express server listening port (defaults to `5001`).

Before running the backend server or DB-related scripts, ensure `DATABASE_URL` and auth-related variables are configured in the environment where the Node process runs.
