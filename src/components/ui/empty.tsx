import { Inbox } from 'lucide-react';

export function EmptyState({ title, description }: { title: string; description?: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-10 text-center text-muted-foreground">
      <Inbox className="mb-3 h-10 w-10" />
      <div className="font-medium text-foreground">{title}</div>
      {description ? <div className="mt-1 text-sm">{description}</div> : null}
    </div>
  );
}
