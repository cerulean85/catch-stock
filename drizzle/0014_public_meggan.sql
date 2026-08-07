CREATE TABLE "accountHolding" (
	"scope" text NOT NULL,
	"code" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"quantity" numeric DEFAULT '0' NOT NULL,
	"avgPrice" numeric DEFAULT '0' NOT NULL,
	"currentPrice" numeric DEFAULT '0' NOT NULL,
	"evalAmount" numeric DEFAULT '0' NOT NULL,
	"pnlAmount" numeric DEFAULT '0' NOT NULL,
	"pnlRate" numeric DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'KRW' NOT NULL,
	"evalAmountKrw" numeric,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accountHolding_scope_code_pk" PRIMARY KEY("scope","code")
);
--> statement-breakpoint
CREATE TABLE "accountSync" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"message" text,
	"publicIp" text,
	"syncedAt" timestamp DEFAULT now() NOT NULL
);
