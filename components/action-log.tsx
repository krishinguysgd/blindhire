export function ActionLog({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="border-y border-border/70 bg-black/30 py-4">
      <div className="container space-y-2 font-mono text-xs text-foreground/55">
        {items.slice(-5).map((item, index) => (
          <p key={`${item}-${index}`}>{item}</p>
        ))}
      </div>
    </div>
  );
}
