"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { parseTagsInput } from "@/lib/utils";
import { createLink, updateLink } from "@/actions/resources";
import { SUGGESTED_CATEGORIES } from "@/lib/constants";
import type { ResourceDTO } from "@/types/resource";

type ResourceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  resource?: ResourceDTO;
  categories: string[];
};

type FormState = {
  title: string;
  url: string;
  description: string;
  category: string;
  tags: string;
  favorite: boolean;
};

const emptyForm: FormState = {
  title: "",
  url: "",
  description: "",
  category: "",
  tags: "",
  favorite: false,
};

export function ResourceFormDialog({
  open,
  onOpenChange,
  mode,
  resource,
  categories,
}: ResourceFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    setError(null);
    setFieldErrors({});

    if (mode === "edit" && resource) {
      setForm({
        title: resource.title,
        url: resource.url ?? "",
        description: resource.description ?? "",
        category: resource.category ?? "",
        tags: resource.tags.join(", "),
        favorite: resource.favorite,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, mode, resource]);

  const categoryOptions = [
    { value: "", label: "Uncategorized" },
    ...Array.from(new Set([...SUGGESTED_CATEGORIES, ...categories])).map((category) => ({
      value: category,
      label: category,
    })),
  ];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      tags: parseTagsInput(form.tags),
      favorite: form.favorite,
      ...(mode === "edit" && resource ? { id: resource.id } : {}),
    };

    startTransition(async () => {
      const result = mode === "edit" ? await updateLink(payload) : await createLink(payload);

      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        return;
      }

      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit link" : "Add link"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the details for this saved link."
              : "Save a new link to your personal resource desk."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Next.js documentation"
              required
              maxLength={200}
            />
            {fieldErrors.title?.[0] ? (
              <p className="text-xs text-destructive">{fieldErrors.title[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={form.url}
              onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="https://nextjs.org/docs"
              required
              maxLength={2048}
            />
            {fieldErrors.url?.[0] ? (
              <p className="text-xs text-destructive">{fieldErrors.url[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Optional notes about this link"
              maxLength={2000}
              rows={3}
            />
            {fieldErrors.description?.[0] ? (
              <p className="text-xs text-destructive">{fieldErrors.description[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                options={categoryOptions}
              />
              {fieldErrors.category?.[0] ? (
                <p className="text-xs text-destructive">{fieldErrors.category[0]}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="react, docs, backend"
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
              {fieldErrors.tags?.[0] ? (
                <p className="text-xs text-destructive">{fieldErrors.tags[0]}</p>
              ) : null}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.favorite}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, favorite: event.target.checked }))
              }
              className="h-4 w-4 rounded border-input"
            />
            Mark as favorite
          </label>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "edit" ? "Saving…" : "Adding…"}
                </>
              ) : mode === "edit" ? (
                "Save changes"
              ) : (
                "Add link"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
