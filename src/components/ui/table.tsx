import * as React from 'react';
import { cn } from '../../lib/utils';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (
  <div className="w-full overflow-auto">
    <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
));
Table.displayName = 'Table';

export const THead = (props: React.HTMLAttributes<HTMLTableSectionElement>): JSX.Element => <thead className="border-b border-white/10" {...props} />;
export const TBody = (props: React.HTMLAttributes<HTMLTableSectionElement>): JSX.Element => <tbody className="[&_tr:last-child]:border-0" {...props} />;
export const TR = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>): JSX.Element => <tr className={cn('border-b border-white/10 transition-colors hover:bg-white/5', className)} {...props} />;
export const TH = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>): JSX.Element => <th className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', className)} {...props} />;
export const TD = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): JSX.Element => <td className={cn('p-4 align-middle', className)} {...props} />;
