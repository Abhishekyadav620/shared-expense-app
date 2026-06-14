# AI Usage Log

Tool: **Cursor** with Claude (Composer / Sonnet).

## How AI was used

- Scaffolding React pages and Express MVC structure
- Prisma schema and migration troubleshooting
- Min Cash Flow debt simplification implementation
- CSV anomaly detection rules and import pipeline
- Documentation drafts (README, SCOPE, DECISIONS)

## Three cases where AI produced incorrect code

### 1. Mark member as left — wrong HTTP method

**Symptom:** "Failed to mark member as left" in UI.  
**AI mistake:** Frontend called `PUT /members/:id/leave` while backend only exposed `PATCH /members/:id/remove`.  
**How found:** Network tab showed 404; grep of routes vs `memberService.js`.  
**Fix:** Aligned frontend to `PATCH .../remove` with `{ leftAt }` and UTC date-only parsing in backend.

### 2. View balances — Prisma schema out of sync

**Symptom:** "Invalid data provided" when loading balances.  
**AI mistake:** Added `groupId` to `Settlement` in schema but migration was not applied; Prisma client queried a column that did not exist in MySQL.  
**How found:** Backend stack trace referenced missing column; `prisma migrate status` showed pending migration.  
**Fix:** Ran `npx prisma migrate deploy` and `npx prisma generate`, restarted server.

### 3. Silent reactivation of departed members on CSV import

**Symptom:** Import could charge Sam for March expenses if CSV referenced a user who had `leftAt` set.  
**AI mistake:** `ensureGroupMember` cleared `leftAt` when re-adding existing members — a silent guess violating assignment rules.  
**How found:** Code review of `databaseImportService.js` while auditing Meera/Sam requirements.  
**Fix:** Removed auto-reactivation; inactive users stay inactive unless admin updates membership separately.

## Prompts that worked well

- "Implement anomaly detection for CSV with detect/surface/handle — no silent guesses"
- "Add balance breakdown API listing each expense line affecting one member's balance"
- "Fix mark left to use existing backend route and show inline errors in modal"

## Prompts that needed correction

- "Add settlement support" — first pass omitted `groupId` on Settlement model, breaking group-scoped queries
- "Wire up import finalize" — first pass skipped server-side re-validation of approve/reject decisions

## Developer responsibility

All merged code was reviewed, tested locally against MySQL, and adjusted where AI assumptions did not match assignment constraints (especially import integrity and membership dates).
