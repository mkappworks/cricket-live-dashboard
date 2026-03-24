# Cricket Live Dashboard

A real-time cricket scoring dashboard built as a TypeScript monorepo. Two live panels update instantly via WebSocket as balls are bowled.

---

## Architecture Decisions

### Monorepo — npm workspaces
Native npm workspaces with no extra tooling (Turborepo, Nx). Two packages share a single `node_modules` and can run together with one command. Simple, zero configuration overhead.

### Real-time — Socket.io
Both panels are driven by Socket.io WebSocket events:
- **Panel 1 (Live Over)** — receives `ball_update` events only. Purely ephemeral; no database involved.
- **Panel 2 (Over Stats)** — receives `over_complete` events when an over finishes. On initial page load it hydrates from `GET /api/stats/:matchId` (one REST call) to show persisted history.

### Database — SQLite via Drizzle ORM
Over statistics have a fixed, well-known schema (over number, runs, wickets, extras, ball-by-ball results). A relational store fits this better than a document store. SQLite requires zero infrastructure — it's a single file. Drizzle ORM is SQL-first with no compilation step; the schema is plain TypeScript and easy to modify. Migrating to PostgreSQL later requires only changing `drizzle.config.ts`.

### Why Drizzle over Prisma
Drizzle is lighter weight, has no schema compilation/generation step, and the schema lives entirely in TypeScript files alongside the application code. It also produces more predictable SQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | npm workspaces |
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Real-time | Socket.io (server + client) |
| ORM | Drizzle ORM |
| Database | SQLite (better-sqlite3) |
| Language | TypeScript (both packages) |

---

## Project Structure

```
cricket-live-dashboard/
├── package.json              # root — npm workspaces
├── tsconfig.base.json        # shared TypeScript config
├── README.md
├── packages/
│   ├── client/               # React app (Vite)
│   │   ├── vite.config.ts    # proxies /api and /socket.io → server
│   │   └── src/
│   │       ├── App.tsx           # layout + socket subscriptions
│   │       ├── socket.ts         # Socket.io client singleton
│   │       ├── components/
│   │       │   ├── LiveOverPanel.tsx   # Panel 1 — ball-by-ball (ephemeral)
│   │       │   └── OverStatsPanel.tsx  # Panel 2 — over history (persisted)
│   │       └── types/cricket.ts
│   └── server/               # Express + Socket.io
│       ├── drizzle.config.ts
│       └── src/
│           ├── index.ts              # entry point (port 3001)
│           ├── db/
│           │   ├── schema.ts         # Drizzle table definitions
│           │   └── client.ts         # Drizzle + SQLite singleton
│           ├── socket/handlers.ts    # in-memory match state + events
│           ├── routes/stats.ts       # GET /api/stats/:matchId
│           └── types/cricket.ts
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Install

```bash
git clone <repo-url>
cd cricket-live-dashboard
npm install
```

### Start development

```bash
npm run dev
```

This starts both packages in parallel:
- **Server** on `http://localhost:3001`
- **Client** on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

### Build for production

```bash
npm run build
```

### Inspect the database

```bash
cd packages/server
npx drizzle-kit studio
```

---

## Socket Events Reference

| Event | Direction | Payload | Description |
|---|---|---|---|
| `match_state` | server → client | `MatchState` | Full state sent on connect |
| `ball_update` | server → client | `{ ball: BallResult, over: number }` | Each new ball (Panel 1) |
| `over_complete` | server → client | `OverStat` | Over finished, DB already written (Panel 2) |
| `add_ball` | client → server | `BallInput` | Submit a ball result |
| `reset_match` | client → server | — | Clear current over from memory |

---

## How Scoring Works

1. The **Scorer bar** at the bottom of the dashboard lets you submit ball results.
2. Choose runs (0–6), mark a wicket, or mark it as an extra (wide, no-ball, bye, leg-bye).
3. Click **Add Ball →** — the server receives `add_ball` via Socket.io.
4. The server appends the ball to the in-memory current over and broadcasts `ball_update` to all connected clients.
5. After **6 legal deliveries** (wides and no-balls don't count), the server:
   - Saves the completed over to SQLite via Drizzle.
   - Broadcasts `over_complete` to all clients.
   - Resets the in-memory current over.
6. Panel 1 resets; Panel 2 gains a new row. Persisted rows survive server restarts.

---

## Data Model

```ts
// Ephemeral — in-memory only
type BallResult = {
  ball: number          // 1–6
  runs: number
  isWicket: boolean
  isExtra: boolean
  extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye'
  description?: string
}

// Persisted to SQLite
type OverStat = {
  id?: number
  matchId: string
  overNumber: number
  runs: number
  wickets: number
  extras: number
  balls: BallResult[]   // stored as JSON string in DB
}
```
