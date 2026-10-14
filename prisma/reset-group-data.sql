-- One-time reset of all group data created before 2026-10-14 21:05 (America/Sao_Paulo). Users are kept.
-- Group deletion cascades to members, expenses, ledger, invites and activity; Payment has no cascade.
DELETE FROM "Payment" WHERE "createdAt" < '2026-10-15 00:05:00';
DELETE FROM "Notification" WHERE "createdAt" < '2026-10-15 00:05:00';
DELETE FROM "Group" WHERE "createdAt" < '2026-10-15 00:05:00';
