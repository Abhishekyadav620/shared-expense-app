# Decision Log

## 1. Relational database: MySQL + Prisma

**Options:** PostgreSQL, MySQL, SQLite  
**Choice:** MySQL with Prisma ORM  
**Why:** Assignment requires relational DB; Prisma gives type-safe migrations and matches Express MVC. MySQL is widely available on free hosting tiers.

## 2. Balances computed, not stored

**Options:** Store running balances vs compute on read  
**Choice:** Compute dynamically in `balanceService.js`  
**Why:** Single source of truth (expenses + settlements). Avoids drift when expenses are edited or members leave. Easier to explain in live evaluation.

## 3. Debt simplification: Min Cash Flow

**Options:** Greedy pairwise matching vs Min Cash Flow (max-flow style)  
**Choice:** Min Cash Flow in `debtSimplificationService.js`  
**Why:** Guarantees minimum number of transactions (Aisha's requirement). Standard algorithm for "who pays whom."

## 4. Multi-currency: store native, convert at display

**Options:** Convert on import vs store USD and convert at balance time  
**Choice:** Store original currency on `Expense`; convert to INR in balance engine using user-approved rate  
**Why:** Priya's requirement — a dollar is not a rupee. Preserves original data; rate is explicit and adjustable on Import Review and Balance pages.

## 5. CSV import: review gate before DB write

**Options:** Auto-fix silently vs block until user approves  
**Choice:** Detect → show in UI → approve/reject/skip → finalize with server re-validation  
**Why:** Meera's requirement and assignment anti-pattern of "silent guess." Matches evaluation expectation to trace anomaly handling in code.

## 6. Member join/leave dates

**Options:** Hard-delete members vs soft leave with `leftAt`  
**Choice:** `GroupMember.leftAt` + optional `joinedAt` edit  
**Why:** Sam/Meera scenario — expenses before join or after leave must not affect balance. Historical membership preserved for audit.

## 7. Settlements as separate entity

**Options:** Negative expenses vs dedicated `Settlement` model  
**Choice:** `Settlement` table with payer/receiver  
**Why:** Assignment data had settlements logged as expenses. Separating them fixes balance math and enables duplicate-settlement detection on import.

## 8. Negative amounts

**Options:** Reject always vs treat as refund  
**Choice:** Flag as `NEGATIVE_AMOUNT` anomaly; import only if user explicitly approves  
**Why:** Assignment asks how to handle negatives — we surface the ambiguity rather than assuming refund or error.

## 9. Duplicate rows

**Options:** Last row wins automatically vs user choice  
**Choice:** Exact duplicates and conflicting duplicates flagged separately; user approves one row  
**Why:** Assignment scenario: two people logged same dinner with different amounts — no automatic winner.

## 10. JWT auth, group-scoped access

**Options:** Session cookies vs JWT  
**Choice:** JWT in Authorization header  
**Why:** Simple SPA integration; stateless API suitable for separate frontend deploy.
