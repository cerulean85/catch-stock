ALTER TABLE "accountTrade" ALTER COLUMN "side" SET DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "accountTrade" ADD COLUMN IF NOT EXISTS "sideLabel" text;--> statement-breakpoint
-- side가 원문 문자열이던 시절의 행을 정규화한다. 원문은 참고용으로 sideLabel에 옮긴다.
UPDATE "accountTrade" SET "sideLabel" = "side" WHERE "side" NOT IN ('buy', 'sell', 'other');--> statement-breakpoint
UPDATE "accountTrade" SET "side" = 'sell' WHERE "side" LIKE '%매도%';--> statement-breakpoint
UPDATE "accountTrade" SET "side" = 'buy' WHERE "side" LIKE '%매수%';--> statement-breakpoint
UPDATE "accountTrade" SET "side" = 'other' WHERE "side" NOT IN ('buy', 'sell', 'other');
