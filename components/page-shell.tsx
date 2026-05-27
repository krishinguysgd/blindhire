"use client";

import { Pill } from "@/components/pill";
import { cn } from "@/lib/utils";

type PageShellProps = {
  eyebrow: string;
  title: string;
  kicker: string;
  children: React.ReactNode;
  className?: string;
};

export function PageShell({ eyebrow, title, kicker, children, className }: PageShellProps) {
  return (
    <main className={cn("app-shell relative min-h-svh overflow-hidden bg-background", className)}>
      <section className="relative z-10 border-b border-border/80 bg-black/80 pt-28 backdrop-blur-md md:pt-36">
        <div className="container grid gap-7 pb-10 md:grid-cols-[0.72fr_0.28fr] md:items-end md:pb-12">
          <div className="min-w-0">
            <Pill className="mb-5">{eyebrow}</Pill>
            <h1 className="max-w-4xl overflow-wrap-anywhere font-sentient text-4xl leading-none sm:text-5xl md:text-6xl">
              {title}
            </h1>
          </div>
          <p className="max-w-xl font-mono text-sm leading-7 text-foreground/60 md:justify-self-end">
            {kicker}
          </p>
        </div>
      </section>
      <div className="relative z-10 bg-black/55">{children}</div>
    </main>
  );
}
