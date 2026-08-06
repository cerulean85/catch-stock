CREATE TABLE "scoringOverlay" (
	"userId" text NOT NULL,
	"symbol" text NOT NULL,
	"moat" smallint,
	"tam" smallint,
	"governance" smallint,
	"geopolitical" smallint,
	"institutionalChange" smallint,
	"riskTag" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scoringOverlay_userId_symbol_pk" PRIMARY KEY("userId","symbol")
);
--> statement-breakpoint
ALTER TABLE "scoringOverlay" ADD CONSTRAINT "scoringOverlay_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;