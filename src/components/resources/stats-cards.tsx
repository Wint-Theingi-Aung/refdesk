import {
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderOpen,
  Image,
  Link2,
  Presentation,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RESOURCE_TYPE_META, RESOURCE_TYPE_IDS, type ResourceTypeId } from "@/lib/constants";
import type { ResourceStats } from "@/types/resource";

const TYPE_ICONS: Record<ResourceTypeId, typeof Link2> = {
  LINK: Link2,
  PDF: FileText,
  EXCEL: FileSpreadsheet,
  PPTX: Presentation,
  DOCX: FileType2,
  IMAGE: Image,
};

type StatsCardsProps = {
  stats: ResourceStats;
};

export function StatsCards({ stats }: StatsCardsProps) {
  const overview = [
    {
      label: "Total Resources",
      value: stats.total,
      icon: FolderOpen,
      description: "All saved items",
    },
    {
      label: "Favorites",
      value: stats.favorites,
      icon: Star,
      description: "Marked as favorite",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {overview.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="mb-4 text-sm font-medium text-muted-foreground">Resources by type</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {RESOURCE_TYPE_IDS.map((type) => {
              const Icon = TYPE_ICONS[type];
              const meta = RESOURCE_TYPE_META[type];
              return (
                <div
                  key={type}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{meta.shortLabel}</p>
                    <p className="text-lg font-semibold leading-tight">
                      {stats.byType[type] ?? 0}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
