import { z } from "zod";
import { ApiError, get, patch, post } from "./client";

const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  role: z.enum(["admin", "viewer"]),
});

const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
  organization: OrganizationSchema,
});

const RegisterResponseSchema = z.object({
  user: UserSchema,
  organization: OrganizationSchema,
  status: z.literal("pending"),
});

const MeResponseSchema = z.object({
  user: UserSchema,
  organization: OrganizationSchema,
});

export type AuthUser = z.infer<typeof UserSchema>;
export type AuthOrganization = z.infer<typeof OrganizationSchema>;

export async function login(email: string, password: string) {
  const data = await post<unknown>("/api/v1/auth/login", { email, password });
  return AuthResponseSchema.parse(data);
}

export async function register(input: {
  inviteCode: string;
  email: string;
  password: string;
  name?: string;
}) {
  const data = await post<unknown>("/api/v1/auth/register", input);
  return RegisterResponseSchema.parse(data);
}

function parseMeResponse(data: unknown) {
  const parsed = MeResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(
      "Unexpected server response while restoring session.",
      0,
    );
  }
  return parsed.data;
}

export async function fetchMe() {
  const data = await get<unknown>("/api/v1/auth/me");
  return parseMeResponse(data);
}

export async function updateMe(input: { name?: string }) {
  const data = await patch<unknown>("/api/v1/auth/me", input);
  return parseMeResponse(data);
}
