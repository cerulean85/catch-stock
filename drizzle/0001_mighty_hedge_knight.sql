CREATE TABLE "journal" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tickers" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"tradeTypes" text[] DEFAULT '{}' NOT NULL,
	"tradeQty" numeric,
	"tradePrice" numeric,
	"tradeFee" numeric,
	"sentiment" smallint,
	"horizon" text,
	"targetReturn" numeric,
	"actualReturn" numeric,
	"tradedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;