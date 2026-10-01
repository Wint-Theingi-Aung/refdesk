"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, FolderOpen, Home, Library, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/?view=all", label: "All Links", icon: Library },
  { href: "/?favorites=true", label: "Favorites", icon: Star },
  { href: "/?categories=1", label: "Categories", icon: FolderOpen },
] as const;

type AppSidebarProps = {
  open?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
};

export function AppSidebar({ open = true, onNavigate, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const search = typeof window !== "undefined" ? window.location.search : "";

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r bg-card",
        "fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center justify-between border-b px-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
          onClick={onNavigate}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookMarked className="h-4 w-4" />
          </span>
          <span>refdesk</span>
        </Link>
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" && !search.includes("favorites=true")
              : item.href.includes("favorites=true")
                ? search.includes("favorites=true")
                : item.href === pathname;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Links-only MVP</p>
          <p className="mt-1">More resource types (PDF, notes, files) are planned later.</p>
        </div>
      </div>
    </aside>
  );
}
