-- CreateTable
CREATE TABLE "UserVehicle" (
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "UserVehicle_pkey" PRIMARY KEY ("userId","vehicleId")
);

-- CreateIndex
CREATE INDEX "UserVehicle_vehicleId_idx" ON "UserVehicle"("vehicleId");

-- AddForeignKey
ALTER TABLE "UserVehicle" ADD CONSTRAINT "UserVehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVehicle" ADD CONSTRAINT "UserVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

