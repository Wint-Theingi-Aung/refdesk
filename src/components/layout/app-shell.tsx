"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <div className="sticky top-0 h-screen">
            <AppSidebar />
          </div>
        </div>

        <div
          className={cn(
            "lg:hidden",
            mobileOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          <AppSidebar
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">Dashboard</h1>
              <p className="truncate text-xs text-muted-foreground">
                Manage your personal links in one place
              </p>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
