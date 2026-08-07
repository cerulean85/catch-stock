CREATE TABLE "accountTrade" (
	"scope" text NOT NULL,
	"tradedOn" text NOT NULL,
	"dealId" text NOT NULL,
	"tradedTime" text,
	"code" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"side" text DEFAULT '' NOT NULL,
	"quantity" numeric DEFAULT '0' NOT NULL,
	"price" numeric DEFAULT '0' NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"fee" numeric,
	"currency" text DEFAULT 'KRW' NOT NULL,
	CONSTRAINT "accountTrade_scope_tradedOn_dealId_pk" PRIMARY KEY("scope","tradedOn","dealId")
);
