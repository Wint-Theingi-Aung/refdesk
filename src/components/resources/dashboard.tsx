"use client";

import { useState } from "react";
import { Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/resources/search-and-filter";
import { ResourceList } from "@/components/resources/resource-list";
import { ResourceFormDialog } from "@/components/resources/resource-form-dialog";
import { StatsCards } from "@/components/resources/stats-cards";
import { RESOURCE_TYPE_META, type ResourceTypeId } from "@/lib/constants";
import type { ResourceDTO, ResourceStats } from "@/types/resource";

type DashboardProps = {
  resources: ResourceDTO[];
  stats: ResourceStats;
  categories: string[];
  filtersActive: boolean;
  favoritesOnly: boolean;
  typeFilter: ResourceTypeId | null;
};

export function Dashboard({
  resources,
  stats,
  categories,
  filtersActive,
  favoritesOnly,
  typeFilter,
}: DashboardProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<ResourceTypeId | undefined>(undefined);

  const heading = favoritesOnly
    ? "Favorite resources"
    : typeFilter
      ? `${RESOURCE_TYPE_META[typeFilter].label} resources`
      : "Your resources";

  const subheading = favoritesOnly
    ? "Items you marked as favorite."
    : typeFilter
      ? `Manage saved ${RESOURCE_TYPE_META[typeFilter].label.toLowerCase()} resources.`
      : "Search, filter, and manage links and uploaded files.";

  const openCreate = (type?: ResourceTypeId) => {
    setCreateType(type);
    setCreateOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
          <p className="text-sm text-muted-foreground">{subheading}</p>
        </div>

        <Button onClick={() => openCreate()} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </div>

      <StatsCards stats={stats} />

      <SearchAndFilter categories={categories} />

      {resources.length > 0 && favoritesOnly ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          Showing {resources.length} favorite {resources.length === 1 ? "item" : "items"}
        </p>
      ) : null}

      <ResourceList
        resources={resources}
        categories={categories}
        filtersActive={filtersActive}
        typeFilter={typeFilter}
      />

      <ResourceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        categories={categories}
        initialType={createType}
      />
    </div>
  );
}
