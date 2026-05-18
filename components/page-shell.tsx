"use client";

import { useState } from "react";
import { Leva } from "leva";
import { GL } from "@/components/gl";
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
  const [hovering, setHovering] = useState(false);

  return (
    <main className={cn("relative min-h-svh overflow-hidden", className)}>
      <GL hovering={hovering} />
      <Leva hidden />
      <section
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="relative z-10 container pt-32 md:pt-44"
      >
        <Pill className="mb-6">{eyebrow}</Pill>
        <div className="max-w-5xl">
          <h1 className="font-sentient text-5xl leading-[0.95] sm:text-6xl md:text-7xl">
            {title}
          </h1>
          <p className="mt-7 max-w-2xl font-mono text-sm leading-7 text-foreground/60 md:text-base">
            {kicker}
          </p>
        </div>
      </section>
      <div className="relative z-10">{children}</div>
    </main>
  );
}
