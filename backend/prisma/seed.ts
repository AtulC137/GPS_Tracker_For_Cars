import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vehicle = await prisma.vehicle.upsert({
    where: { deviceId: "phone-AT" },
    update: {},
    create: {
      vehicleName: "My Phone",
      vehicleNumber: "PHONE-AT",
      deviceId: "phone-AT",
      liveState: {
        create: {
          latitude: 18.5204,
          longitude: 73.8567,
          speed: 0,
          heading: 0,
          lastSeenAt: new Date(),
          status: "offline",
        },
      },
    },
    include: { liveState: true },
  });

  const phone001 = await prisma.vehicle.upsert({
    where: { deviceId: "phone-001" },
    update: {},
    create: {
      vehicleName: "Test Phone",
      vehicleNumber: "PHONE-001",
      deviceId: "phone-001",
      liveState: {
        create: {
          latitude: 18.5204,
          longitude: 73.8567,
          speed: 0,
          heading: 0,
          lastSeenAt: new Date(),
          status: "offline",
        },
      },
    },
  });

  const demoImei = process.env.AIS140_DEMO_IMEI ?? "888888888888999";
  const ais140DeviceId = `ais140-${demoImei}`;

  const car = await prisma.vehicle.upsert({
    where: { deviceId: ais140DeviceId },
    update: {},
    create: {
      vehicleName: "AIS-140 Demo Car",
      vehicleNumber: "MH01P80000",
      deviceId: ais140DeviceId,
      liveState: {
        create: {
          latitude: 18.5314,
          longitude: 73.8446,
          speed: 0,
          heading: 90,
          lastSeenAt: new Date(),
          status: "offline",
        },
      },
    },
  });

  console.log("Seeded vehicles:", vehicle.id, phone001.id, car.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
