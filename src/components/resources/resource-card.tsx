"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  ExternalLink,
  Folder,
  Pencil,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatDisplayName } from "@/lib/utils";
import { deleteLink, toggleFavorite } from "@/actions/resources";
import type { ResourceDTO } from "@/types/resource";
import { DeleteLinkDialog } from "@/components/resources/delete-link-dialog";
import { ResourceFormDialog } from "@/components/resources/resource-form-dialog";

type ResourceCardProps = {
  resource: ResourceDTO;
  categories: string[];
};

export function ResourceCard({ resource, categories }: ResourceCardProps) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFavorite = () => {
    setError(null);
    startTransition(async () => {
      const result = await toggleFavorite({ id: resource.id });
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  const handleDelete = async (): Promise<string | null> => {
    const result = await deleteLink({ id: resource.id });
    if (!result.success) {
      setError(result.error);
      return result.error;
    }
    setError(null);
    return null;
  };

  const domain = (() => {
    try {
      return new URL(resource.url ?? "").hostname.replace(/^www\./, "");
    } catch {
      return resource.url ?? "";
    }
  })();

  return (
    <>
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="line-clamp-2 text-base leading-snug">{resource.title}</CardTitle>
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <a
                  href={resource.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:text-foreground hover:underline"
                >
                  {domain}
                </a>
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleFavorite}
              disabled={isPending}
              aria-label={resource.favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  resource.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                )}
              />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4">
          {resource.description ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">{resource.description}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {resource.category ? (
              <Badge variant="secondary" className="gap-1">
                <Folder className="h-3 w-3" />
                {resource.category}
              </Badge>
            ) : null}

            {resource.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="gap-1">
                <Tag className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Updated {new Date(resource.updatedAt).toLocaleDateString()}
            </p>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setEditOpen(true)}
                aria-label={`Edit ${resource.title}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                aria-label={`Delete ${resource.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <ResourceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        resource={resource}
        categories={categories}
      />

      <DeleteLinkDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={resource.title}
        onConfirm={handleDelete}
      />
    </>
  );
}
