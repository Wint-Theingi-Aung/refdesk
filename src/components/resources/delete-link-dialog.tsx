"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DeleteLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Human label for the resource type, e.g. "Link", "PDF", "Excel". */
  typeLabel?: string;
  /** Returns an error message, or null/undefined on success. */
  onConfirm: () => Promise<string | null | void>;
};

export function DeleteLinkDialog({
  open,
  onOpenChange,
  title,
  typeLabel = "Link",
  onConfirm,
}: DeleteLinkDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await onConfirm();
        if (typeof result === "string" && result) {
          setError(result);
          return;
        }
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to delete ${typeLabel.toLowerCase()}.`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete {typeLabel}?
          </DialogTitle>
          <DialogDescription>
            You are about to permanently delete{" "}
            <span className="font-medium text-foreground">“{title}”</span>. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              `Delete ${typeLabel}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
