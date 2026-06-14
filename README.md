# Shared Expenses App

A full-stack Splitwise-style application for tracking shared flatmate expenses, built for the Spreetail assignment scenario (Aisha, Rohan, Priya, Meera, Dev, Sam).

**Stack:** React + Vite + Tailwind (frontend) · Node.js + Express + Prisma + MySQL (backend)

## Features

| Requirement | Implementation |
|---|---|
| Login / auth | JWT register & login |
| Group management | Create groups, add members, join/leave dates |
| Expense splits | EQUAL, EXACT, PERCENTAGE, SHARE |
| Balances | Per-member net balance (paid − share ± settlements) |
| Debt simplification | Min Cash Flow algorithm — one payment per debtor |
| Balance traceability | Per-member breakdown showing every contributing line |
| Multi-currency | USD stored natively; converted to INR at user-specified rate |
| CSV import | Upload → anomaly detection → manual review → import report |
| Settlements | Record payments between members |

## Setup

### Prerequisites

- Node.js 18+
- MySQL 8+

### Backend

```bash
cd backend
cp ../.env.example .env   # edit DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate deploy
npm run dev               # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

The frontend expects the API at `http://localhost:5000/api` (see `frontend/src/services/api.js`). For production, set `VITE_API_URL` before building.

### Sample CSV

A sample file with deliberate data problems is at `data/expenses_export.csv`. Use **Import** in the navbar to upload it. Set member join/leave dates on your group first (Meera left end of March, Sam joined mid-April) so inactive-user checks work.

## AI tools used

Cursor (Claude) for scaffolding, debugging Prisma migrations, and documentation. See `AI_USAGE.md`.

## Documentation

- `SCOPE.md` — anomaly log (15 issue types) and database schema
- `DECISIONS.md` — architectural decision log
- `AI_USAGE.md` — AI usage and correction examples

## Deployment

Deploy backend (Railway/Render/Fly) and frontend (Vercel/Netlify) separately. Run `npx prisma migrate deploy` on the production database. Set `DATABASE_URL`, `JWT_SECRET`, and optionally `USD_TO_INR_RATE` in the backend environment.
