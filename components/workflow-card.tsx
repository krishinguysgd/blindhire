import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowCardProps = {
  href: string;
  icon: LucideIcon;
  step?: string;
  title: string;
  body: string;
  cta?: string;
  className?: string;
};

export function WorkflowCard({ href, icon: Icon, step, title, body, cta = "Open flow", className }: WorkflowCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group grid min-h-[220px] border-y border-border/70 py-6 transition-colors duration-150 hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <Icon className="size-5 text-primary" />
        {step ? <span className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/35">{step}</span> : null}
      </div>
      <div className="mt-5">
        <h2 className="font-sentient text-3xl leading-tight">{title}</h2>
        <p className="mt-3 font-mono text-sm leading-6 text-foreground/55">{body}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 self-end font-mono text-xs uppercase tracking-[0.18em] text-primary transition-colors group-hover:text-primary/80">
        {cta}
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

export function MetricTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-y border-border/70 py-5">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/40">{label}</p>
      <strong className="mt-3 block font-sentient text-4xl font-normal text-foreground">{value}</strong>
      <p className="mt-2 font-mono text-xs leading-5 text-foreground/45">{detail}</p>
    </div>
  );
}

export function FlowRail({ steps }: { steps: string[] }) {
  return (
    <div className="container py-8">
      <div className="grid gap-3 border-y border-border/70 py-5 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="grid grid-cols-[32px_1fr] gap-3">
            <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
            <p className="font-mono text-xs uppercase leading-5 tracking-[0.16em] text-foreground/55">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
