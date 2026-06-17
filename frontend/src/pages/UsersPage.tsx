import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { createUser, updateUser } from "@/api/users";
import { useVehicles } from "@/hooks/useVehicles";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState, ErrorState } from "@/components/ui/spinner";

export function UsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const usersQuery = useUsers();
  const vehiclesQuery = useVehicles();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicles = vehiclesQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const assignedVehicleIds = useMemo(() => {
    const set = new Set<string>();
    for (const u of users) {
      for (const id of u.vehicleIds) set.add(id);
    }
    return set;
  }, [users]);

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        id: v.id,
        label: `${v.vehicleName} (${v.vehicleNumber})`,
        assigned: assignedVehicleIds.has(v.id),
      })),
    [vehicles, assignedVehicleIds],
  );

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorState message="Forbidden" />
      </div>
    );
  }

  if (usersQuery.isLoading || vehiclesQuery.isLoading) {
    return <LoadingState label="Loading users…" />;
  }
  if (usersQuery.isError) {
    return (
      <ErrorState
        message={(usersQuery.error as Error)?.message}
        onRetry={() => usersQuery.refetch()}
      />
    );
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createUser({
        email,
        password,
        name: name.trim() || undefined,
        role: "viewer",
        vehicleIds,
      });
      setEmail("");
      setPassword("");
      setName("");
      setVehicleIds([]);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVehicle = (id: string) => {
    setVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const assignVehicles = async (userId: string, ids: string[]) => {
    try {
      await updateUser(userId, { vehicleIds: ids });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update user.");
    }
  };

  const setUserStatus = async (
    userId: string,
    status: "pending" | "active" | "rejected",
  ) => {
    try {
      await updateUser(userId, { status });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update user.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create users and assign vehicles. Non-admin users only see assigned vehicles.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Create user</h2>
        <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Assign vehicles</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {vehicleOptions.map((v) => (
                <label
                  key={v.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={vehicleIds.includes(v.id)}
                    onChange={() => toggleVehicle(v.id)}
                  />
                  <span className="min-w-0 truncate">{v.label}</span>
                </label>
              ))}
              {vehicleOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No vehicles yet. Create vehicles first.
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="sm:col-span-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Organization users</h2>
        </div>
        <div className="divide-y divide-border">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              vehicleOptions={vehicleOptions}
              onAssign={assignVehicles}
              onSetStatus={setUserStatus}
            />
          ))}
          {users.length === 0 && (
            <div className="px-6 py-10">
              <p className="text-sm text-muted-foreground">No users yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  vehicleOptions,
  onAssign,
  onSetStatus,
}: {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    status?: string;
    vehicleIds: string[];
  };
  vehicleOptions: { id: string; label: string; assigned: boolean }[];
  onAssign: (userId: string, vehicleIds: string[]) => Promise<void>;
  onSetStatus: (userId: string, status: "pending" | "active" | "rejected") => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>(user.vehicleIds);
  const isViewer = user.role === "viewer";
  const status = (user.status ?? "active") as "pending" | "active" | "rejected";

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await onAssign(user.id, selected);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setSelected(user.vehicleIds);
    setOpen(false);
  };

  return (
    <div className="px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user.name ?? "—"} · {user.role} · {status}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vehicles: {user.vehicleIds.length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isViewer && status === "pending" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onSetStatus(user.id, "active")}
            >
              Approve
            </Button>
          )}
          {isViewer && status === "pending" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onSetStatus(user.id, "rejected")}
            >
              Reject
            </Button>
          )}

          {isViewer && status === "active" && (
            !open ? (
              <Button type="button" variant="outline" onClick={() => setOpen(true)}>
                Assign vehicles
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={onSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            )
          )}
        </div>
      </div>

      {open && isViewer && status === "active" && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {vehicleOptions.map((v) => (
            <label
              key={v.id}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(v.id)}
                disabled={v.assigned && !selected.includes(v.id)}
                onChange={() => toggle(v.id)}
              />
              <span className="min-w-0 truncate">{v.label}</span>
            </label>
          ))}
          {vehicleOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No vehicles available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

