-- Add org invite code, user approval status, and exclusive vehicle assignment.

-- Organization: inviteCode (unique)
ALTER TABLE "Organization"
ADD COLUMN "inviteCode" TEXT;

UPDATE "Organization"
SET "inviteCode" = 'INVITE-' || "slug"
WHERE "inviteCode" IS NULL;

ALTER TABLE "Organization"
ALTER COLUMN "inviteCode" SET NOT NULL;

CREATE UNIQUE INDEX "Organization_inviteCode_key" ON "Organization"("inviteCode");

-- User: status (pending/active/rejected)
ALTER TABLE "User"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';

-- UserVehicle: vehicleId can be assigned to only one user
CREATE UNIQUE INDEX "UserVehicle_vehicleId_unique" ON "UserVehicle"("vehicleId");

