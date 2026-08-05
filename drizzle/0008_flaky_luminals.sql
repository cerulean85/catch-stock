CREATE TABLE "marketNote" (
	"userId" text PRIMARY KEY NOT NULL,
	"preClose" text DEFAULT '' NOT NULL,
	"postClose" text DEFAULT '' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketNote" ADD CONSTRAINT "marketNote_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;