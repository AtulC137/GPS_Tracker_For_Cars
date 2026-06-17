import { z } from "zod";
import { get, patch, post } from "./client";

export const UserWithVehiclesSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  role: z.string(),
  status: z.string().optional(),
  createdAt: z.string(),
  vehicleIds: z.array(z.string()),
});

export type UserWithVehicles = z.infer<typeof UserWithVehiclesSchema>;

export async function fetchUsers(): Promise<UserWithVehicles[]> {
  const data = await get<unknown>("/api/v1/users");
  return z.array(UserWithVehiclesSchema).parse(data);
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
  role?: "viewer";
  vehicleIds?: string[];
}): Promise<UserWithVehicles> {
  const data = await post<unknown>("/api/v1/users", input);
  return UserWithVehiclesSchema.parse(data);
}

export async function updateUser(
  id: string,
  input: {
    name?: string;
    role?: "viewer";
    status?: "pending" | "active" | "rejected";
    vehicleIds?: string[];
  },
): Promise<UserWithVehicles> {
  const data = await patch<unknown>(`/api/v1/users/${id}`, input);
  return UserWithVehiclesSchema.parse(data);
}

