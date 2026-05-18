import { cn } from "@/lib/utils";

export const inputClass =
  "w-full border-0 border-b border-foreground/20 bg-transparent px-0 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-foreground/25 focus:border-primary";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/45">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "min-h-28 resize-y leading-6", props.className)} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, props.className)} />;
}
