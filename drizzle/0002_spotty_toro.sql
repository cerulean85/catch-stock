CREATE TABLE IF NOT EXISTS "watchlistItem" (
	"userId" text NOT NULL,
	"symbol" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watchlistItem_userId_symbol_pk" PRIMARY KEY("userId","symbol")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "watchlistItem" ADD CONSTRAINT "watchlistItem_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
