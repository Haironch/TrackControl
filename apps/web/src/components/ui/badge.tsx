import * as React from 'react';
import { cn } from '@/lib/utils';
import { colorClasses } from '@/lib/colors';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
  dot?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({ className, color = 'slate', dot = false, size = 'md', children, ...props }: BadgeProps) {
  const c = colorClasses(color);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium ring-1 ring-inset whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        c.badge,
        className,
      )}
      {...props}
    >
      {dot ? <span className={cn('size-1.5 rounded-full', c.dot)} /> : null}
      {children}
    </span>
  );
}
