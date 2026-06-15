import bcrypt from "bcryptjs";
import { prisma } from "../db/client.js";

export type UserRole = "admin" | "viewer";

export interface JwtUserPayload {
  sub: string;
  orgId: string;
  role: UserRole;
  email: string;
}

function slugifyOrganizationName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "org";
}

async function uniqueOrganizationSlug(name: string): Promise<string> {
  const base = slugifyOrganizationName(name);
  let slug = base;
  let suffix = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

function formatAuthResult(
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    organizationId: string;
    organization: { id: string; name: string; slug: string };
  },
) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    },
    organization: {
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug,
    },
    payload: {
      sub: user.id,
      orgId: user.organizationId,
      role: user.role as UserRole,
      email: user.email,
    } satisfies JwtUserPayload,
  };
}

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return null;
    }

    return formatAuthResult(user);
  }

  async register(input: {
    organizationName: string;
    email: string;
    password: string;
    name?: string;
  }) {
    const email = input.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new EmailAlreadyExistsError();
    }

    const passwordHash = await AuthService.hashPassword(input.password);
    const slug = await uniqueOrganizationSlug(input.organizationName);

    const user = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName.trim(),
          slug,
          maxVehicles: 100,
        },
      });

      return tx.user.create({
        data: {
          email,
          passwordHash,
          name: input.name?.trim() || null,
          role: "admin",
          organizationId: organization.id,
        },
        include: { organization: true },
      });
    });

    return formatAuthResult(user);
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
    };
  }

  static async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailAlreadyExistsError";
  }
}
