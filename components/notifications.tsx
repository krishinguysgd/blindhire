"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BlindHireNotification } from "@/lib/use-blindhire";
import { shortAddress } from "@/lib/metadata";

type NotificationsProps = {
  loadNotifications: () => Promise<BlindHireNotification[]>;
};

export function Notifications({ loadNotifications }: NotificationsProps) {
  const [items, setItems] = useState<BlindHireNotification[]>([]);

  const refresh = useCallback(async () => {
    setItems(await loadNotifications());
  }, [loadNotifications]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <section className="border-t border-border/80">
      <div className="container py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="size-4 text-primary" />
            <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-foreground/70">Live Event Inbox</h2>
          </div>
          <Button type="button" size="sm" onClick={refresh}>
            <RefreshCcw />
            [Refresh]
          </Button>
        </div>
        <div className="divide-y divide-border/70 border-y border-border/70">
          {items.length === 0 ? (
            <div className="py-5 font-mono text-sm text-foreground/50">No recent contract events found.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="grid gap-2 py-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">{item.label}</p>
                  <p className="mt-2 font-mono text-sm text-foreground/60">{item.detail}</p>
                </div>
                <span className="font-mono text-xs text-foreground/40">
                  {item.transactionHash ? shortAddress(item.transactionHash) : item.blockNumber ? `Block ${item.blockNumber}` : "Indexed"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
