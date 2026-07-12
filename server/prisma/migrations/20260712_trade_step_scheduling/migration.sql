-- Item-level trade-step scheduling: when a request is sent and when it's due.
-- Nullable, non-destructive. Steps themselves live in trade_steps.
ALTER TABLE "punch_items" ADD COLUMN "send_date" TEXT;
ALTER TABLE "punch_items" ADD COLUMN "due_date" TEXT;
