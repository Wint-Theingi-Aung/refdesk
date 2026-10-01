"use client";

import { useState } from "react";
import { Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/resources/search-and-filter";
import { ResourceList } from "@/components/resources/resource-list";
import { ResourceFormDialog } from "@/components/resources/resource-form-dialog";
import { StatsCards } from "@/components/resources/stats-cards";
import type { ResourceDTO, ResourceStats } from "@/types/resource";

type DashboardProps = {
  resources: ResourceDTO[];
  stats: ResourceStats;
  categories: string[];
  filtersActive: boolean;
  favoritesOnly: boolean;
};

export function Dashboard({
  resources,
  stats,
  categories,
  filtersActive,
  favoritesOnly,
}: DashboardProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {favoritesOnly ? "Favorite links" : "Your links"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {favoritesOnly
              ? "Links you marked as favorite."
              : "Search, filter, and manage saved resources."}
          </p>
        </div>

        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </div>

      <StatsCards stats={stats} />

      <SearchAndFilter categories={categories} />

      {resources.length > 0 && favoritesOnly ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          Showing {resources.length} favorite {resources.length === 1 ? "link" : "links"}
        </p>
      ) : null}

      <ResourceList
        resources={resources}
        categories={categories}
        filtersActive={filtersActive}
      />

      <ResourceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        categories={categories}
      />
    </div>
  );
}
