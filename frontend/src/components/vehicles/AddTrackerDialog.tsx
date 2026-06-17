import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Car, Copy, Plus, Smartphone } from "lucide-react";
import { createVehicle } from "@/api/vehicles";
import type { CreateVehicleInput, TrackerSetup } from "@/api/types";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = "choose" | "form" | "setup";
type TrackerChoice = "ais140" | "owntracks_phone";

function CopyRow({ label, value }: { label: string; value: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="break-all font-mono text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={`Copy ${label}`}
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

function SetupInstructions({ setup }: { setup: TrackerSetup }) {
  if (setup.trackerType === "ais140") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{setup.note}</p>
        <CopyRow label="IMEI" value={setup.imei} />
        <CopyRow label="VRN / plate" value={setup.vehicleNumber} />
        <CopyRow label="Device ID" value={setup.deviceId} />
        <CopyRow label="Server host" value={setup.tcpHost} />
        <CopyRow label="TCP port" value={String(setup.tcpPort)} />
        <p className="text-xs text-muted-foreground">
          Protocol: {setup.protocol}. Configure these on the AIS-140 VLT per MH SOP before
          the vehicle sends its first packet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{setup.note}</p>
      <CopyRow label="Tracker ID (tid)" value={setup.tid} />
      <CopyRow label="Device ID" value={setup.deviceId} />
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">HTTP mode (ngrok)</h4>
        <CopyRow label="URL" value={setup.http.url} />
        {setup.http.authRequired && setup.http.authHint && (
          <p className="text-xs text-muted-foreground">{setup.http.authHint}</p>
        )}
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">MQTT + Tailscale</h4>
        <CopyRow label="Broker host" value={setup.mqtt.host} />
        <CopyRow label="Port" value={String(setup.mqtt.port)} />
        <CopyRow label="Topic" value={setup.mqtt.topic} />
        <p className="text-xs text-muted-foreground">{setup.mqtt.tailscaleNote}</p>
      </div>
    </div>
  );
}

export function AddTrackerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [choice, setChoice] = useState<TrackerChoice | null>(null);
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [imei, setImei] = useState("");
  const [tid, setTid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [setup, setSetup] = useState<TrackerSetup | null>(null);
  const [createdVehicleId, setCreatedVehicleId] = useState<string | null>(null);

  const reset = () => {
    setStep("choose");
    setChoice(null);
    setVehicleName("");
    setVehicleNumber("");
    setImei("");
    setTid("");
    setError(null);
    setSetup(null);
    setCreatedVehicleId(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    if (!choice) return;
    setError(null);
    setSubmitting(true);

    const payload: CreateVehicleInput =
      choice === "ais140"
        ? {
            trackerType: "ais140",
            vehicleName,
            vehicleNumber,
            imei,
          }
        : {
            trackerType: "owntracks_phone",
            vehicleName,
            vehicleNumber,
            tid,
          };

    try {
      const result = await createVehicle(payload);
      setSetup(result.setup);
      setCreatedVehicleId(result.vehicle.id);
      setStep("setup");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add tracker");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add tracker</DialogTitle>
          <DialogDescription>
            Register a device in your fleet, then configure the hardware or phone app.
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setChoice("ais140");
                setStep("form");
              }}
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent/40"
            >
              <Car className="h-6 w-6 text-primary" />
              <span className="font-semibold">AIS-140 VLT</span>
              <span className="text-xs text-muted-foreground">
                In-car hardware over TCP (MH SOP)
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setChoice("owntracks_phone");
                setStep("form");
              }}
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent/40"
            >
              <Smartphone className="h-6 w-6 text-primary" />
              <span className="font-semibold">OwnTracks phone</span>
              <span className="text-xs text-muted-foreground">
                HTTP (ngrok) or MQTT (Tailscale)
              </span>
            </button>
          </div>
        )}

        {step === "form" && choice && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <p className="text-sm font-medium text-foreground">
              {choice === "ais140" ? "AIS-140 vehicle" : "OwnTracks phone"}
            </p>
            <div className="space-y-2">
              <Label htmlFor="vehicleName">Vehicle name</Label>
              <Input
                id="vehicleName"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="My Car"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">Plate / VRN</Label>
              <Input
                id="vehicleNumber"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="MH01AB1234"
                required
              />
            </div>
            {choice === "ais140" ? (
              <div className="space-y-2">
                <Label htmlFor="imei">IMEI (15 digits)</Label>
                <Input
                  id="imei"
                  value={imei}
                  onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
                  placeholder="888888888888999"
                  pattern="\d{15}"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="tid">Tracker ID (tid)</Label>
                <Input
                  id="tid"
                  value={tid}
                  onChange={(e) =>
                    setTid(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 8))
                  }
                  placeholder="AT"
                  required
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("choose")}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Adding…" : "Add tracker"}
              </Button>
            </div>
          </form>
        )}

        {step === "setup" && setup && (
          <div className="space-y-4">
            <SetupInstructions setup={setup} />
            <div className="flex flex-wrap gap-2">
              {createdVehicleId && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/vehicles/$id" params={{ id: createdVehicleId }}>
                    View vehicle
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AddTrackerButton({
  onCreated,
  className,
}: {
  onCreated: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className={cn(className)}>
        <Plus className="mr-2 h-4 w-4" />
        Add tracker
      </Button>
      <AddTrackerDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
    </>
  );
}
