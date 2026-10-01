"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookMarked,
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderOpen,
  Home,
  Image,
  Link2,
  Presentation,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RESOURCE_TYPE_META, RESOURCE_TYPE_IDS } from "@/lib/constants";

type AppSidebarProps = {
  open?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
};

const TYPE_ICONS = {
  LINK: Link2,
  PDF: FileText,
  EXCEL: FileSpreadsheet,
  PPTX: Presentation,
  DOCX: FileType2,
  IMAGE: Image,
} as const;

export function AppSidebar({ open = true, onNavigate, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeType = searchParams.get("type") ?? "";
  const favoritesOnly = searchParams.get("favorites") === "true";
  const hasSearch = Boolean(searchParams.get("q"));
  const hasCategory = Boolean(searchParams.get("category"));

  const buildHref = (params: Record<string, string | null>) => {
    const next = new URLSearchParams();
    // Preserve search/category when switching type filters
    if (params.type !== undefined) {
      if (params.type) next.set("type", params.type);
    } else if (activeType) {
      next.set("type", activeType);
    }
    if (params.favorites !== undefined) {
      if (params.favorites === "true") next.set("favorites", "true");
    } else if (favoritesOnly) {
      next.set("favorites", "true");
    }
    if (hasSearch && params.type !== undefined) {
      const q = searchParams.get("q");
      if (q) next.set("q", q);
    }
    if (hasCategory && params.type !== undefined) {
      const category = searchParams.get("category");
      if (category) next.set("category", category);
    }
    const query = next.toString();
    return query ? `/?${query}` : "/";
  };

  const isDashboard = pathname === "/" && !activeType && !favoritesOnly;
  const isFavorites = favoritesOnly && !activeType;
  const isAllResources = pathname === "/" && !activeType && !favoritesOnly;

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

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        <div className="space-y-1">
          <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          <Link
            href="/"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isDashboard
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href={buildHref({ type: "", favorites: "false" })}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isAllResources
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <FolderOpen className="h-4 w-4" />
            All Resources
          </Link>
          <Link
            href={buildHref({ type: "", favorites: "true" })}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isFavorites
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Star className="h-4 w-4" />
            Favorites
          </Link>
        </div>

        <div className="space-y-1">
          <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Resource types
          </p>
          {RESOURCE_TYPE_IDS.map((type) => {
            const Icon = TYPE_ICONS[type];
            const isActive = activeType === type && !favoritesOnly;
            return (
              <Link
                key={type}
                href={buildHref({ type, favorites: "false" })}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {RESOURCE_TYPE_META[type].shortLabel}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Personal Resource Manager</p>
          <p className="mt-1">
            Links, PDFs, Excel, PPTX, DOCX, and images — stored in Neon + file storage.
          </p>
        </div>
      </div>
    </aside>
  );
}
