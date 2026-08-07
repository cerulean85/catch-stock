CREATE TABLE "riskAssessment" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"scope" text NOT NULL,
	"code" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"level" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"watchlist" text[] DEFAULT '{}' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"searched" boolean DEFAULT false NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "riskAssessment" ADD CONSTRAINT "riskAssessment_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;