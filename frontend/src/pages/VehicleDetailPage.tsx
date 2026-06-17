import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  Gauge,
  History,
  MapPin,
  Navigation,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useVehicle, useVehicleLive } from "@/hooks/useVehicles";
import { useVehicleStore, mergedPosition } from "@/store/vehicleStore";
import { VehicleStatusBadge } from "@/components/vehicles/VehicleStatusBadge";
import { FleetMap } from "@/components/map/FleetMap";
import {
  formatCoord,
  formatDateTime,
  formatHeading,
  formatSpeed,
  relativeTime,
} from "@/lib/format";
import { ErrorState, LoadingState } from "@/components/ui/spinner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateVehicle } from "@/api/vehicles";
import { ApiError } from "@/api/client";

export function VehicleDetailPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: vehicle, isLoading, isError, error, refetch } = useVehicle(id);
  const { data: live } = useVehicleLive(id);
  const storePos = useVehicleStore((s) => s.positions[id]);

  const [editing, setEditing] = useState(false);
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (live) {
      useVehicleStore.getState().updatePosition({
        type: "vehicle_location_update",
        vehicleId: id,
        latitude: live.latitude,
        longitude: live.longitude,
        speed: live.speed,
        heading: live.heading,
        lastSeenAt: live.lastSeenAt,
      });
    }
  }, [live, id]);

  useEffect(() => {
    if (!vehicle) return;
    setVehicleName(vehicle.vehicleName);
    setVehicleNumber(vehicle.vehicleNumber);
  }, [vehicle]);

  const isAdmin = user?.role === "admin";

  const canSave = useMemo(() => {
    if (!isAdmin) return false;
    if (!editing) return false;
    const name = vehicleName.trim();
    const number = vehicleNumber.trim();
    return name.length > 0 && number.length > 0;
  }, [isAdmin, editing, vehicleName, vehicleNumber]);

  const pos = storePos ?? mergedPosition(vehicle, undefined);

  if (isLoading) return <LoadingState label="Loading vehicle…" />;
  if (isError || !vehicle)
    return (
      <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
    );

  const merged = [{ ...vehicle, live: pos ?? undefined }];

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateVehicle(id, {
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.trim(),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
        queryClient.invalidateQueries({ queryKey: ["vehicle", id] }),
      ]);
      setEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Unable to save vehicle.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setVehicleName(vehicle.vehicleName);
    setVehicleNumber(vehicle.vehicleNumber);
    setSaveError(null);
    setEditing(false);
  };

  const info = [
    { icon: MapPin, label: "Location", value: formatCoord(pos?.latitude, pos?.longitude) },
    { icon: Gauge, label: "Speed", value: formatSpeed(pos?.speed) },
    { icon: Navigation, label: "Heading", value: formatHeading(pos?.heading) },
    { icon: Clock, label: "Last Seen", value: `${relativeTime(pos?.lastSeenAt)} (${formatDateTime(pos?.lastSeenAt)})` },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <Link
        to="/vehicles"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to vehicles
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{vehicle.vehicleName}</h1>
            <VehicleStatusBadge status={pos?.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {vehicle.vehicleNumber} · Device {vehicle.deviceId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && !editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSaveError(null);
                setEditing(true);
              }}
            >
              Edit details
            </Button>
          )}
          {isAdmin && editing && (
            <>
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={onSave} disabled={!canSave || saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
          <Link
            to="/vehicles/$id/history"
            params={{ id }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <History className="h-4 w-4" /> History & Analysis
          </Link>
        </div>
      </div>

      {isAdmin && editing && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicleName">Vehicle name</Label>
              <Input
                id="vehicleName"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="e.g. Delivery Van 3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">Vehicle number</Label>
              <Input
                id="vehicleNumber"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. MH12AB1234"
              />
            </div>
          </div>
          {saveError && (
            <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveError}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          {info.map((i) => (
            <div
              key={i.label}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <i.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{i.label}</p>
                <p className="text-sm font-medium">{i.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          {pos ? (
            <FleetMap
              vehicles={merged}
              focusId={id}
              className="h-[440px] w-full"
            />
          ) : (
            <div className="flex h-[440px] items-center justify-center text-sm text-muted-foreground">
              No location data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}