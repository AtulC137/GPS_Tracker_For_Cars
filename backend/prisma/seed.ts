import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_ORG_ID = "org_demo_fleet";

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-fleet" },
    update: { name: "Demo Fleet", maxVehicles: 100, inviteCode: "DEMO-FLEET" },
    create: {
      id: DEMO_ORG_ID,
      name: "Demo Fleet",
      slug: "demo-fleet",
      inviteCode: "DEMO-FLEET",
      maxVehicles: 100,
    },
  });

  const adminHash = await hashPassword("Admin123!");
  const viewerHash = await hashPassword("Viewer123!");

  await prisma.user.upsert({
    where: { email: "admin@demo-fleet.local" },
    update: {
      passwordHash: adminHash,
      name: "Fleet Admin",
      role: "admin",
      status: "active",
      organizationId: org.id,
    },
    create: {
      email: "admin@demo-fleet.local",
      passwordHash: adminHash,
      name: "Fleet Admin",
      role: "admin",
      status: "active",
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@demo-fleet.local" },
    update: {
      passwordHash: viewerHash,
      name: "Fleet Viewer",
      role: "viewer",
      status: "active",
      organizationId: org.id,
    },
    create: {
      email: "viewer@demo-fleet.local",
      passwordHash: viewerHash,
      name: "Fleet Viewer",
      role: "viewer",
      status: "active",
      organizationId: org.id,
    },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { deviceId: "phone-AT" },
    update: { organizationId: org.id },
    create: {
      vehicleName: "My Phone",
      vehicleNumber: "PHONE-AT",
      deviceId: "phone-AT",
      organizationId: org.id,
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
    update: { organizationId: org.id },
    create: {
      vehicleName: "Test Phone",
      vehicleNumber: "PHONE-001",
      deviceId: "phone-001",
      organizationId: org.id,
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
    update: { organizationId: org.id },
    create: {
      vehicleName: "AIS-140 Demo Car",
      vehicleNumber: "MH01P80000",
      deviceId: ais140DeviceId,
      organizationId: org.id,
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

  console.log("Seeded organization:", org.id, org.slug);
  console.log("Seeded users: admin@demo-fleet.local / viewer@demo-fleet.local");
  console.log("Seeded vehicles:", vehicle.id, phone001.id, car.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
