-- Build-stage tracking on projects, for the real dashboard.
-- stage defaults to Pre-construction; dates are nullable, non-destructive.
ALTER TABLE "projects" ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'Pre-construction';
ALTER TABLE "projects" ADD COLUMN "start_date" TEXT;
ALTER TABLE "projects" ADD COLUMN "target_date" TEXT;
ALTER TABLE "projects" ADD COLUMN "completed_at" TEXT;
