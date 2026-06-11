import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export function StatCard({ title, value, note, icon: Icon }: { title: string; value: string | number; note?: string; icon: LucideIcon }): JSX.Element {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
            {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
          </div>
          <div className="rounded-xl bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 p-3 text-indigo-200">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
