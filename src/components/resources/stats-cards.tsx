import { Bookmark, Link2, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ResourceStats } from "@/types/resource";

type StatsCardsProps = {
  stats: ResourceStats;
};

export function StatsCards({ stats }: StatsCardsProps) {
  const items = [
    {
      label: "Total Resources",
      value: stats.total,
      icon: Link2,
      description: "All saved links",
    },
    {
      label: "Favorites",
      value: stats.favorites,
      icon: Star,
      description: "Marked as favorite",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
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
  );
}

export function EmptyStateIcon() {
  return <Bookmark className="h-10 w-10 text-muted-foreground/40" />;
}
