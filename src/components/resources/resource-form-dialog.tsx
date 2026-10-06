"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { Loader2, Upload } from "lucide-react";
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
import { parseTagsInput, formatFileSize, sanitizeFileName } from "@/lib/utils";
import { createFileResource, createLink, updateFileResource, updateResource } from "@/actions/resources";
import {
  FILE_RESOURCE_TYPES,
  RESOURCE_TYPE,
  RESOURCE_TYPE_META,
  RESOURCE_TYPE_IDS,
  getMaxFileSizeBytes,
  isFileResourceType,
  type ResourceTypeId,
} from "@/lib/constants";
import { validateUploadedFile } from "@/lib/validations/resource";
import { ResourceTypeIcon } from "@/components/resources/resource-type-icon";
import type { ResourceDTO } from "@/types/resource";

type ResourceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  resource?: ResourceDTO;
  categories: string[];
  /** Preselect type when creating (from sidebar “Add PDF” style actions). */
  initialType?: ResourceTypeId;
};

type FormState = {
  type: ResourceTypeId;
  title: string;
  url: string;
  description: string;
  category: string;
  tags: string;
  favorite: boolean;
};

function emptyForm(type: ResourceTypeId = RESOURCE_TYPE.LINK): FormState {
  return {
    type,
    title: "",
    url: "",
    description: "",
    category: "",
    tags: "",
    favorite: false,
  };
}

export function ResourceFormDialog({
  open,
  onOpenChange,
  mode,
  resource,
  categories,
  initialType,
}: ResourceFormDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  const maxFileSize = useMemo(() => getMaxFileSizeBytes(), []);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setFieldErrors({});
    setFile(null);

    if (mode === "edit" && resource) {
      setForm({
        type: resource.type,
        title: resource.title,
        url: resource.url ?? "",
        description: resource.description ?? "",
        category: resource.category ?? "",
        tags: resource.tags.join(", "),
        favorite: resource.favorite,
      });
    } else {
      setForm(emptyForm(initialType ?? RESOURCE_TYPE.LINK));
    }
  }, [open, mode, resource, initialType]);

  const isEditingFile = mode === "edit" && resource && isFileResourceType(resource.type);
  const isEditingLink = mode === "edit" && resource && resource.type === RESOURCE_TYPE.LINK;
  const isCreating = mode === "create";
  const selectedIsFile = isFileResourceType(form.type);
  const showFileReplace = Boolean(isCreating && selectedIsFile) || Boolean(isEditingFile);

  const categoryOptions = [
    { value: "", label: "Uncategorized" },
    ...Array.from(new Set([...categories, ...[]])).map((category) => ({
      value: category,
      label: category,
    })),
  ];

  const typeOptions = RESOURCE_TYPE_IDS.map((type) => ({
    value: type,
    label: RESOURCE_TYPE_META[type].label,
  }));

  const acceptAttribute = useMemo(() => {
    if (!selectedIsFile) return undefined;
    const configExtensions = {
      PDF: ".pdf",
      EXCEL: ".xlsx,.xls",
      PPTX: ".pptx,.ppt",
      DOCX: ".docx,.doc",
      IMAGE: ".png,.jpg,.jpeg,.gif,.webp,.svg",
    } as const;
    return configExtensions[form.type as keyof typeof configExtensions];
  }, [selectedIsFile, form.type]);

  const handleFileSelected = (selected: File | null) => {
    setError(null);
    setFieldErrors((prev) => ({ ...prev, file: [] }));
    if (!selected) {
      setFile(null);
      return;
    }

    const validationError = validateUploadedFile(form.type, {
      name: selected.name,
      size: selected.size,
      type: selected.type,
    });

    if (validationError) {
      setFile(null);
      setError(validationError);
      setFieldErrors((prev) => ({ ...prev, file: [validationError] }));
      return;
    }

    setFile(selected);
    // Default title from filename when title is empty
    setForm((prev) => ({
      ...prev,
      title: prev.title.trim() ? prev.title : sanitizeFileName(selected.name).replace(/\.[^.]+$/, ""),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation before network call
    if (mode === "create" && selectedIsFile) {
      if (!file) {
        const message = "Choose a file to upload.";
        setError(message);
        setFieldErrors({ file: [message] });
        return;
      }
      const validationError = validateUploadedFile(form.type, {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      if (validationError) {
        setError(validationError);
        setFieldErrors({ file: [validationError] });
        return;
      }
    }

    if (mode === "edit" && isEditingFile && file) {
      const validationError = validateUploadedFile(resource!.type, {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      if (validationError) {
        setError(validationError);
        setFieldErrors({ file: [validationError] });
        return;
      }
    }

    if (mode === "create" && form.type === RESOURCE_TYPE.LINK && !form.url.trim()) {
      const message = "URL is required.";
      setError(message);
      setFieldErrors({ url: [message] });
      return;
    }

    if (mode === "edit" && resource && resource.type === RESOURCE_TYPE.LINK && !form.url.trim()) {
      const message = "URL is required.";
      setError(message);
      setFieldErrors({ url: [message] });
      return;
    }

    startTransition(async () => {
      if (mode === "edit" && resource) {
        // File resources: optional replacement upload; no file = metadata only
        if (isFileResourceType(resource.type)) {
          if (file) {
            const formData = new FormData();
            formData.set("id", resource.id);
            formData.set("title", form.title.trim());
            formData.set("description", form.description.trim());
            formData.set("category", form.category.trim());
            formData.set("tags", parseTagsInput(form.tags).join(", "));
            formData.set("favorite", form.favorite ? "true" : "false");
            formData.set("file", file);

            const replaceResult = await updateFileResource(formData);
            if (!replaceResult.success) {
              setError(replaceResult.error);
              if (replaceResult.fieldErrors) setFieldErrors(replaceResult.fieldErrors);
              return;
            }
            onOpenChange(false);
            return;
          }
        }

        const payload = {
          id: resource.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          tags: parseTagsInput(form.tags),
          favorite: form.favorite,
          ...(resource.type === RESOURCE_TYPE.LINK
            ? { url: form.url.trim() }
            : {}),
        };

        const result = await updateResource(payload);
        if (!result.success) {
          setError(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        onOpenChange(false);
        return;
      }

      // Create
      if (form.type === RESOURCE_TYPE.LINK) {
        const result = await createLink({
          title: form.title.trim(),
          url: form.url.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          tags: parseTagsInput(form.tags),
          favorite: form.favorite,
        });
        if (!result.success) {
          setError(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        onOpenChange(false);
        return;
      }

      if (!file) {
        const message = "Choose a file to upload.";
        setError(message);
        setFieldErrors({ file: [message] });
        return;
      }

      const formData = new FormData();
      formData.set("type", form.type);
      formData.set("title", form.title.trim());
      formData.set("description", form.description.trim());
      formData.set("category", form.category.trim());
      formData.set("tags", parseTagsInput(form.tags).join(", "));
      formData.set("favorite", form.favorite ? "true" : "false");
      formData.set("file", file);

      const result = await createFileResource(formData);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      onOpenChange(false);
    });
  };

  const dialogTitle =
    mode === "edit"
      ? isEditingFile
        ? "Edit file resource"
        : "Edit link"
      : selectedIsFile
        ? `Add ${RESOURCE_TYPE_META[form.type].label}`
        : "Add link";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? isEditingFile
                ? "Update the details for this saved file."
                : "Update the details for this saved link."
              : selectedIsFile
                ? "Upload a file and save it to your resource desk."
                : "Save a new link to your personal resource desk."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isCreating ? (
            <div className="space-y-2">
              <Label htmlFor="resource-type">Resource type</Label>
              <Select
                id="resource-type"
                value={form.type}
                onChange={(event) => {
                  const next = event.target.value as ResourceTypeId;
                  setForm((prev) => ({ ...prev, type: next }));
                  setFile(null);
                  setError(null);
                  setFieldErrors({});
                }}
                options={typeOptions}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ResourceTypeIcon type={form.type} className="h-7 w-7" />
                {selectedIsFile
                  ? "File upload — supported formats vary by type."
                  : "Link — save a URL with optional notes."}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={
                selectedIsFile || isEditingFile
                  ? "Quarterly budget"
                  : "Next.js documentation"
              }
              required
              maxLength={200}
            />
            {fieldErrors.title?.[0] ? (
              <p className="text-xs text-destructive">{fieldErrors.title[0]}</p>
            ) : null}
          </div>

          {isCreating && form.type === RESOURCE_TYPE.LINK ? (
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
          ) : null}

          {isEditingLink ? (
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
          ) : null}

          {showFileReplace ? (
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <div className="flex flex-col gap-2 rounded-md border border-dashed border-input p-3">
                <Input
                  id="file"
                  type="file"
                  accept={acceptAttribute}
                  onChange={(event) => handleFileSelected(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Allowed:{" "}
                  {(() => {
                    const map: Record<string, string> = {
                      PDF: ".pdf",
                      EXCEL: ".xlsx, .xls",
                      PPTX: ".pptx, .ppt",
                      DOCX: ".docx, .doc",
                      IMAGE: ".png, .jpg, .jpeg, .gif, .webp, .svg",
                    };
                    return map[isEditingFile && resource ? resource.type : form.type] ?? "";
                  })()}
                  {" · "}Max {formatFileSize(maxFileSize)}
                </p>
                {file ? (
                  <p className="flex items-center gap-1.5 text-xs text-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    {file.name} ({formatFileSize(file.size)})
                  </p>
                ) : null}
              </div>
              {fieldErrors.file?.[0] ? (
                <p className="text-xs text-destructive">{fieldErrors.file[0]}</p>
              ) : null}
            </div>
          ) : null}

          {isEditingFile && resource ? (
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Current file</p>
              <p className="mt-1 truncate">
                {resource.fileName ?? "—"}
                {resource.fileSize ? ` · ${formatFileSize(resource.fileSize)}` : ""}
              </p>
              <p className="mt-1">
                {file
                  ? "A new file is selected — it will replace the stored file when you save."
                  : "Leave the file field empty to keep the current file. Select a new file to replace it."}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Optional notes"
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
              ) : selectedIsFile ? (
                "Upload & save"
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

export { FILE_RESOURCE_TYPES };
