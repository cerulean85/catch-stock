ALTER TABLE "journal" ADD COLUMN "linkedJournalId" text;--> statement-breakpoint
ALTER TABLE "journal" ADD COLUMN "reviewAt" timestamp;--> statement-breakpoint
ALTER TABLE "journal" ADD COLUMN "reviewedAt" timestamp;