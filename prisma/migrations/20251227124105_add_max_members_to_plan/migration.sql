-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxMembers" INTEGER NOT NULL DEFAULT 1;

-- Update existing plans with appropriate maxMembers values
UPDATE "SubscriptionPlan" SET "maxMembers" = 2 WHERE "type" = 'FRESHIE';
UPDATE "SubscriptionPlan" SET "maxMembers" = 5 WHERE "type" = 'MONEY_HONEY';
UPDATE "SubscriptionPlan" SET "maxMembers" = 12 WHERE "type" = 'WOLF_OF_WALLSTREET';
