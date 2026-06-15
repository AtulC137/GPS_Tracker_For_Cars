-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "trackerType" TEXT NOT NULL DEFAULT 'ais140';

UPDATE "Vehicle" SET "trackerType" = 'owntracks_phone' WHERE "deviceId" LIKE 'phone-%';
UPDATE "Vehicle" SET "trackerType" = 'ais140' WHERE "deviceId" LIKE 'ais140-%';
