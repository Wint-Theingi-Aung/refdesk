import { Suspense } from "react";
import { getResources, getResourceStats } from "@/actions/resources";
import { Dashboard } from "@/components/resources/dashboard";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  category?: string;
  favorites?: string;
  view?: string;
  categories?: string;
};

function normalizeCategory(value?: string) {
  return (value ?? "").trim().slice(0, 60);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const search = (searchParams.q ?? "").trim().slice(0, 200);
  const category = normalizeCategory(searchParams.category);
  const favoritesOnly = searchParams.favorites === "true";

  const [resources, stats] = await Promise.all([
    getResources({
      search,
      category,
      favorites: favoritesOnly,
    }),
    getResourceStats(),
  ]);

  const filtersActive = Boolean(search || category || favoritesOnly);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard
        resources={resources}
        stats={stats}
        categories={stats.categories}
        filtersActive={filtersActive}
        favoritesOnly={favoritesOnly}
      />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse space-y-6">
      <div className="h-10 w-48 rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-xl bg-muted" />
        <div className="h-28 rounded-xl bg-muted" />
      </div>
      <div className="h-10 rounded-md bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-48 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
