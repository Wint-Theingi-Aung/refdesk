import { Bookmark, FolderOpen, SearchX } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResourceCard } from "@/components/resources/resource-card";
import type { ResourceDTO } from "@/types/resource";

type ResourceListProps = {
  resources: ResourceDTO[];
  categories: string[];
  filtersActive: boolean;
};

export function ResourceList({ resources, categories, filtersActive }: ResourceListProps) {
  if (resources.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          {filtersActive ? (
            <SearchX className="h-10 w-10 text-muted-foreground/50" />
          ) : (
            <Bookmark className="h-10 w-10 text-muted-foreground/50" />
          )}
          <div className="space-y-1">
            <p className="font-medium">
              {filtersActive ? "No links match your filters" : "No links yet"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {filtersActive
                ? "Try adjusting your search or category filter."
                : "Add your first link to start building your personal resource desk."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} categories={categories} />
      ))}
    </div>
  );
}

export function ResourceListHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <CardHeader className="p-0">
      <CardTitle className="flex items-center gap-2 text-lg">
        <FolderOpen className="h-5 w-5" />
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );
}
