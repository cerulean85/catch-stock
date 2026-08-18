-- goldilocksScan은 이전에 한 번 생성됐다가 마이그레이션 목록에서 빠졌다.
-- 이미 테이블이 있는 DB와 새로 만드는 DB 양쪽에서 돌아가도록 조건부로 만든다.
CREATE TABLE IF NOT EXISTS "goldilocksScan" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"searched" boolean DEFAULT false NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "goldilocksScan" ADD CONSTRAINT "goldilocksScan_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "journal" ADD COLUMN IF NOT EXISTS "processScore" smallint;--> statement-breakpoint
ALTER TABLE "journal" ADD COLUMN IF NOT EXISTS "reviewNote" text;
