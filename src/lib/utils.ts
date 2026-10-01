import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDisplayName(input: string) {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const rounded = size >= 100 ? Math.round(size) : size >= 10 ? Math.round(size * 10) / 10 : Math.round(size * 100) / 100;
  return `${rounded} ${units[unitIndex]}`;
}

/** Sanitize a client filename for use in storage keys / Content-Disposition. */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "file";
  const cleaned = base
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 120) || "file";
}

export function getDomainFromUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
