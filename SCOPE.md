# Scope — Anomaly Log & Database Schema

## CSV import anomaly log

The importer detects **15 deliberate issue types**. For each: detect → surface to user → require explicit approve/reject/skip before import. Server-side finalize re-validates decisions.

| # | Issue type | Detection | Policy |
|---|---|---|---|
| 1 | `EXACT_DUPLICATE` | Same title, amount, date, payer within CSV | User must approve to import; default suggestion: reject duplicate |
| 2 | `CONFLICTING_DUPLICATE` | Same title, date, payer but different amounts | User picks which row wins; reject the other |
| 3 | `NEGATIVE_AMOUNT` | Amount < 0 | Flag as refund/adjustment; user approves or rejects — never silently imported |
| 4 | `INACTIVE_USER` | Payer/participant not in group or not active on expense date (join/leave) | User approves override or rejects row |
| 5 | `SETTLEMENT_AS_EXPENSE` | Title/type/splitType indicates payment not shared cost | Suggest recording as settlement; user decides |
| 6 | `INVALID_PERCENTAGE_SPLIT` | PERCENTAGE shares missing or not 100 | Reject or fix before import |
| 7 | `MISSING_PARTICIPANTS` | EQUAL/EXACT/etc. with no participants | Reject unless user approves with manual fix |
| 8 | `USD_CURRENCY` | Currency is USD | Surface for user to confirm exchange rate at review (not 1:1) |
| 9 | `MISSING_AMOUNT` | Empty or non-numeric amount | Reject |
| 10 | `ZERO_AMOUNT` | Amount = 0 | Reject |
| 11 | `MISSING_DATE` | No expense date | Reject |
| 12 | `MISSING_PAYER` | No paidBy | Reject |
| 13 | `UNKNOWN_SPLIT_TYPE` | Split type not in EQUAL/EXACT/PERCENTAGE/SHARE | Reject |
| 14 | `INVALID_EXACT_SPLIT` | EXACT shares don't sum to total | Reject |
| 15 | `MISSING_RECEIVER` | Settlement row without receiver | Reject |

**Additional cross-check:** rows matching existing settlements in the group are flagged as duplicate settlements.

**No silent guesses:** left members are never auto-reactivated on import. Rejected rows cannot appear in `approvedRows` at finalize (server validates).

## Import report

After finalize, the app returns a JSON report (`ImportReportPage`) listing row counts, anomalies reviewed, actions taken, and `usdToInrRate` used.

## Database schema (Prisma / MySQL)

```
User
  id, name, email, password, createdAt

Group
  id, name, createdBy → User, createdAt

GroupMember
  id, groupId → Group, userId → User
  joinedAt, leftAt (nullable — null = still active)

Expense
  id, groupId, title, amount, currency (INR|USD)
  paidBy → User, expenseDate, splitType (EQUAL|EXACT|PERCENTAGE|SHARE)

ExpenseParticipant
  id, expenseId, userId, shareAmount
  unique (expenseId, userId)

Settlement
  id, groupId, payerId → User, receiverId → User
  amount, paymentDate
```

**Balance is not stored.** Computed at read time:

```
balance = totalPaid − totalShare − settlementsPaid + settlementsReceived
```

USD amounts converted to INR using `USD_TO_INR_RATE` env default or user-provided rate on balance/import screens.

**Active member rule (Sam/Meera):** expense applies only if `joinedAt ≤ expenseDate ≤ leftAt` (or `leftAt` is null).
