import {
  FileSpreadsheet,
  FileText,
  FileType2,
  Image,
  Link2,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { RESOURCE_TYPE_META, type ResourceTypeId } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<ResourceTypeId, LucideIcon> = {
  LINK: Link2,
  PDF: FileText,
  EXCEL: FileSpreadsheet,
  PPTX: Presentation,
  DOCX: FileType2,
  IMAGE: Image,
};

type ResourceTypeIconProps = {
  type: ResourceTypeId;
  className?: string;
  iconClassName?: string;
};

export function resourceTypeIcon(type: ResourceTypeId): LucideIcon {
  return ICONS[type] ?? Link2;
}

export function ResourceTypeIcon({
  type,
  className,
  iconClassName,
}: ResourceTypeIconProps) {
  const Icon = resourceTypeIcon(type);
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
        className
      )}
      aria-hidden="true"
    >
      <Icon className={cn("h-4 w-4", iconClassName)} />
    </span>
  );
}

export function resourceTypeLabel(type: ResourceTypeId): string {
  return RESOURCE_TYPE_META[type]?.label ?? type;
}
