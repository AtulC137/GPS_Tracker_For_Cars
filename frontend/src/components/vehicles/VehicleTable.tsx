import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Search, Trash2 } from "lucide-react";
import type { MergedVehicle } from "@/hooks/useMergedVehicles";
import { VehicleStatusBadge } from "./VehicleStatusBadge";
import { VehicleCard } from "./VehicleCard";
import { formatSpeed, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/spinner";
import { useAuth } from "@/context/AuthContext";
import { updateVehicle, deleteVehicle } from "@/api/vehicles";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SortKey = "vehicleName" | "vehicleNumber" | "status" | "speed" | "lastSeen";

export function VehicleTable({
  vehicles,
  canEdit,
}: {
  vehicles: MergedVehicle[];
  canEdit: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("vehicleName");
  const [asc, setAsc] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = vehicles.filter(
      (v) =>
        !q ||
        v.vehicleName.toLowerCase().includes(q) ||
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.deviceId.toLowerCase().includes(q),
    );
    const dir = asc ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sort) {
        case "speed":
          return ((a.live?.speed ?? 0) - (b.live?.speed ?? 0)) * dir;
        case "status":
          return (
            (a.live?.status ?? "").localeCompare(b.live?.status ?? "") * dir
          );
        case "lastSeen":
          return (
            (new Date(a.live?.lastSeenAt ?? 0).getTime() -
              new Date(b.live?.lastSeenAt ?? 0).getTime()) *
            dir
          );
        default:
          return a[sort].localeCompare(b[sort]) * dir;
      }
    });
  }, [vehicles, query, sort, asc]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(true);
    }
  };

  const headers: { key: SortKey; label: string }[] = [
    { key: "vehicleName", label: "Vehicle" },
    { key: "vehicleNumber", label: "Number" },
    { key: "status", label: "Status" },
    { key: "speed", label: "Speed" },
    { key: "lastSeen", label: "Last Seen" },
  ];

  const startEdit = (v: MergedVehicle) => {
    setSaveError(null);
    setEditingId(v.id);
    setVehicleName(v.vehicleName);
    setVehicleNumber(v.vehicleNumber);
  };

  const cancelEdit = () => {
    setSaveError(null);
    setEditingId(null);
    setVehicleName("");
    setVehicleNumber("");
  };

  const onSave = async (id: string) => {
    if (!canEdit || user?.role !== "admin") return;
    const name = vehicleName.trim();
    const number = vehicleNumber.trim();
    if (!name || !number) return;

    setSaving(true);
    setSaveError(null);
    try {
      await updateVehicle(id, { vehicleName: name, vehicleNumber: number });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
        queryClient.invalidateQueries({ queryKey: ["vehicle", id] }),
      ]);
      cancelEdit();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Unable to save vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (v: MergedVehicle) => {
    if (!canEdit || user?.role !== "admin") return;
    const confirmed = window.confirm(
      `Delete "${v.vehicleName}" (${v.vehicleNumber})? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(v.id);
    setSaveError(null);
    if (editingId === v.id) cancelEdit();

    try {
      await deleteVehicle(v.id);
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.removeQueries({ queryKey: ["vehicle", v.id] });
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Unable to delete vehicle.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, number or device…"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No vehicles found" description="Try a different search term." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {headers.map((h) => (
                    <th key={h.key} className="px-4 py-3 font-medium">
                      <button
                        onClick={() => toggleSort(h.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {h.label}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    tabIndex={0}
                    onClick={() =>
                      navigate({ to: "/vehicles/$id", params: { id: v.id } })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        navigate({
                          to: "/vehicles/$id",
                          params: { id: v.id },
                        });
                    }}
                    className="cursor-pointer outline-none hover:bg-accent/50 focus:bg-accent/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {editingId === v.id ? (
                        <Input
                          value={vehicleName}
                          onChange={(e) => setVehicleName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8"
                        />
                      ) : (
                        v.vehicleName
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {editingId === v.id ? (
                        <Input
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8"
                        />
                      ) : (
                        v.vehicleNumber
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <VehicleStatusBadge status={v.live?.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatSpeed(v.live?.speed)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {relativeTime(v.live?.lastSeenAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.trackerType === "owntracks_phone" ? "Phone" : "AIS-140"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.deviceId}
                    </td>
                    {canEdit && (
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editingId === v.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => onSave(v.id)}
                              disabled={saving || !vehicleName.trim() || !vehicleNumber.trim()}
                            >
                              {saving ? "Saving…" : "Save"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(v)}
                            >
                              Quick edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => void onDelete(v)}
                              disabled={deletingId === v.id}
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingId === v.id ? "Deleting…" : "Delete"}
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEdit && saveError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveError}
            </p>
          )}

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
            {filtered.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                canEdit={canEdit}
                onDelete={canEdit ? () => void onDelete(v) : undefined}
                deleting={deletingId === v.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}