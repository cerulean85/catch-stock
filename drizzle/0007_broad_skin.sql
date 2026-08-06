CREATE TABLE "investmentPrinciple" (
	"userId" text PRIMARY KEY NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investmentPrinciple" ADD CONSTRAINT "investmentPrinciple_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;