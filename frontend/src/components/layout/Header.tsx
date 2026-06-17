import { LogOut, Menu, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVehicleStore } from "@/store/vehicleStore";
import { cn } from "@/lib/utils";

export function Header({ onMenu }: { onMenu: () => void }) {
  const connected = useVehicleStore((s) => s.wsConnected);
  const { user, organization, logout } = useAuth();

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4">
      <button
        onClick={onMenu}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        {organization && (
          <p className="truncate text-sm font-semibold text-foreground">
            {organization.name}
          </p>
        )}
        {user && (
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        )}
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          connected
            ? "bg-primary/10 text-primary"
            : "bg-amber-500/15 text-amber-700",
        )}
      >
        {connected ? (
          <Wifi className="h-3.5 w-3.5" />
        ) : (
          <WifiOff className="h-3.5 w-3.5" />
        )}
        {connected ? "Live" : "Reconnecting"}
      </span>
      <button
        onClick={() => logout()}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Log out</span>
      </button>
    </header>
  );
}
