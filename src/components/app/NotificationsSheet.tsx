import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCheck, Info, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/fns/notifications";
import { cn } from "@/lib/utils";

const severityIcon: Record<NotificationRow["severity"], typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCheck,
  WARNING: TriangleAlert,
  ALERT: TriangleAlert,
};

const severityColor: Record<NotificationRow["severity"], string> = {
  INFO: "text-blue-500 bg-blue-500/10",
  SUCCESS: "text-emerald-500 bg-emerald-500/10",
  WARNING: "text-amber-500 bg-amber-500/10",
  ALERT: "text-destructive bg-destructive/10",
};

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export function NotificationsSheet({
  open,
  onOpenChange,
  defaultTab = "all",
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "all" | "alerts";
  onChanged?: () => void;
}) {
  const navigate = useNavigate();
  const listFn = useServerFn(listNotifications);
  const markReadFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "alerts">(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      try {
        const res = await listFn();
        setItems(res.items);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, listFn]);

  const visible =
    tab === "alerts"
      ? items.filter((n) => n.severity === "ALERT" || n.severity === "WARNING")
      : items;

  async function openItem(n: NotificationRow) {
    if (!n.readAt) {
      await markReadFn({ data: { id: n.id } });
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      onChanged?.();
    }
    onOpenChange(false);
    if (n.href) await navigate({ href: n.href });
  }

  async function markAllVisibleRead() {
    await markAllFn({ data: { alertsOnly: tab === "alerts" } });
    setItems((prev) =>
      prev.map((n) => {
        const inScope = tab === "all" || n.severity === "ALERT" || n.severity === "WARNING";
        return inScope ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n;
      }),
    );
    onChanged?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={{ top: "1.25rem", right: "1.25rem", bottom: "1.25rem", left: "auto" }}
        className="flex h-auto w-full flex-col gap-0 overflow-hidden rounded-xl border-0 p-0 shadow-2xl sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>

        <div className="border-b border-border/60 px-5 py-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "alerts")}>
            <TabsList>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="alerts">Alertes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-3 py-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Rien à signaler.</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {visible.map((n) => {
                const Icon = severityIcon[n.severity];
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void openItem(n)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/50",
                      !n.readAt && "bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                        severityColor[n.severity],
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{n.title}</span>
                        {!n.readAt && (
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className="line-clamp-2 block text-xs text-muted-foreground">
                        {n.body}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="grid grid-cols-2 gap-2.5 border-t border-border/60 p-4">
          <Button variant="outline" size="sm" onClick={() => void markAllVisibleRead()}>
            Tout marquer comme lu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              void navigate({ to: "/notifications", search: { view: tab } });
            }}
          >
            Voir tout
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
