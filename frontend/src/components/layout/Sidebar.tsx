import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Map, Truck, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const baseItems = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard, exact: true },
  { title: "Live Map", to: "/map", icon: Map, exact: false },
  { title: "Vehicles", to: "/vehicles", icon: Truck, exact: false },
  { title: "Profile", to: "/profile", icon: User, exact: false },
] as const;

const adminItems = [
  { title: "Users", to: "/users", icon: User, exact: false },
] as const;

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const items = user?.role === "admin" ? [...baseItems, ...adminItems] : baseItems;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Truck className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              Fleet Tracker
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-xs text-muted-foreground">
          Realtime GPS fleet monitoring
        </div>
      </aside>
    </>
  );
}
