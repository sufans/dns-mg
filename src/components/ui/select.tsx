import * as React from 'react';
import { cn } from '../../lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn('h-10 rounded-md border border-input bg-slate-950/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring', className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
