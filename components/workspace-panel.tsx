import { cn } from "@/lib/utils";

export function WorkspacePanel({
  eyebrow,
  title,
  body,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-y border-border/70 bg-black/20 p-5 md:p-7", className)}>
      <div className="mb-7">
        {eyebrow ? <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{eyebrow}</p> : null}
        <h2 className="mt-2 font-sentient text-3xl leading-tight">{title}</h2>
        {body ? <p className="mt-3 font-mono text-sm leading-6 text-foreground/55">{body}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StepAside({
  title,
  steps,
  note,
  className,
}: {
  title: string;
  steps: string[];
  note?: string;
  className?: string;
}) {
  return (
    <aside className={cn("border-y border-border/70 bg-black/25 p-5 md:p-7", className)}>
      <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-foreground/70">{title}</h2>
      <div className="mt-6 space-y-5">
        {steps.map((step, index) => (
          <div key={step} className="grid grid-cols-[32px_1fr] gap-3">
            <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
            <p className="font-mono text-sm leading-6 text-foreground/60">{step}</p>
          </div>
        ))}
      </div>
      {note ? <p className="mt-7 border-t border-border/70 pt-5 font-mono text-xs leading-6 text-foreground/45">{note}</p> : null}
    </aside>
  );
}

export function FormDivider({ title }: { title: string }) {
  return (
    <div className="border-t border-border/70 pt-7">
      <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/45">{title}</h3>
    </div>
  );
}
