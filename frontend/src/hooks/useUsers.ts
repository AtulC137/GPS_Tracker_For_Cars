import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchUsers } from "@/api/users";

export const usersQueryOptions = () =>
  queryOptions({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 30_000,
  });

export function useUsers() {
  return useQuery(usersQueryOptions());
}

