"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SUGGESTED_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type SearchAndFilterProps = {
  categories: string[];
  className?: string;
};

export function SearchAndFilter({ categories, className }: SearchAndFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeSearch = searchParams.get("q") ?? "";
  const activeCategory = searchParams.get("category") ?? "";
  const activeFavorites = searchParams.get("favorites") === "true";

  const [searchValue, setSearchValue] = useState(activeSearch);
  const debouncedRef = useRef(false);

  useEffect(() => {
    setSearchValue(activeSearch);
  }, [activeSearch]);

  useEffect(() => {
    if (activeSearch === searchValue) return;

    const timer = setTimeout(() => {
      if (debouncedRef.current) return;
      debouncedRef.current = true;
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue) {
        params.set("q", searchValue);
      } else {
        params.delete("q");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      window.setTimeout(() => {
        debouncedRef.current = false;
      }, 100);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, activeSearch, pathname, router, searchParams]);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const hasActiveFilters = Boolean(activeSearch || activeCategory || activeFavorites);

  const categoryOptions = [
    { value: "", label: "All categories" },
    ...Array.from(new Set([...SUGGESTED_CATEGORIES, ...categories])).map((category) => ({
      value: category,
      label: category,
    })),
  ];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by title, URL, description, or tag…"
          className="pl-9 pr-9"
          aria-label="Search links"
        />
        {searchValue ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => setSearchValue("")}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select
            value={activeCategory}
            onChange={(event) => updateParam("category", event.target.value || null)}
            options={categoryOptions}
            aria-label="Filter by category"
            className="max-w-xs"
          />
        </div>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.replace(pathname, { scroll: false })}
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
