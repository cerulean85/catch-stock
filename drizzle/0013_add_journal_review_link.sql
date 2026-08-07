ALTER TABLE "journal" ADD COLUMN IF NOT EXISTS "linkedJournalId" text;--> statement-breakpoint
ALTER TABLE "journal" ADD COLUMN IF NOT EXISTS "reviewAt" timestamp;--> statement-breakpoint
ALTER TABLE "journal" ADD COLUMN IF NOT EXISTS "reviewedAt" timestamp;
