import bcrypt from "bcryptjs";
import { prisma } from "../db/client.js";

export type UserRole = "admin" | "viewer";
export type UserStatus = "pending" | "active" | "rejected";

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
    status: string;
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

    if ((user.status as UserStatus) !== "active") {
      throw new AccountNotApprovedError();
    }

    return formatAuthResult(user);
  }

  async register(input: {
    inviteCode: string;
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

    const inviteCode = input.inviteCode.trim();
    const organization = await prisma.organization.findUnique({
      where: { inviteCode },
    });
    if (!organization) {
      throw new InvalidInviteCodeError();
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name?.trim() || null,
        role: "viewer",
        status: "pending",
        organizationId: organization.id,
      },
      include: { organization: true },
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

  async updateMe(userId: string, input: { name?: string | null }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name:
          input.name === undefined ? undefined : input.name?.trim() || null,
      },
      include: { organization: true },
    });

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

export class InvalidInviteCodeError extends Error {
  constructor() {
    super("Invalid invite code");
    this.name = "InvalidInviteCodeError";
  }
}

export class AccountNotApprovedError extends Error {
  constructor() {
    super("Account pending approval");
    this.name = "AccountNotApprovedError";
  }
}
