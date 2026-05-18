import { CheckCircle2, CircleDashed, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

export function Ledger({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-border/80", className)}>
      <div className="container py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-foreground/70">{title}</h2>
          {action}
        </div>
        <div className="divide-y divide-border/70 border-y border-border/70">{children}</div>
      </div>
    </section>
  );
}

export function LedgerRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-5 py-5 md:grid-cols-[1fr_auto] md:items-center", className)}>{children}</div>;
}

export function StateLabel({
  state,
  children,
}: {
  state: "private" | "revealed" | "verified" | "pending";
  children: React.ReactNode;
}) {
  const Icon =
    state === "revealed" ? UnlockKeyhole : state === "verified" ? CheckCircle2 : state === "pending" ? CircleDashed : LockKeyhole;

  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-foreground/55">
      <Icon className="size-4 text-primary" />
      {children}
    </span>
  );
}
