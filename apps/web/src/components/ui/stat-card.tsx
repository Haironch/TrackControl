import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colorClasses } from '@/lib/colors';
import { Card } from './card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: string;
  hint?: string;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function StatCard({ label, value, icon: Icon, color = 'slate', hint, onClick, className, compact }: StatCardProps) {
  const c = colorClasses(color);
  return (
    <Card
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('relative overflow-hidden transition-all', compact ? 'p-4' : 'p-5', onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-elevated', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-500">{label}</p>
          <p className={cn('mt-1.5 font-bold tracking-tight text-slate-900 tabular', compact ? 'text-xl' : 'text-2xl')}>{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-slate-400">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn('flex shrink-0 items-center justify-center rounded-lg', compact ? 'size-8' : 'size-10', c.soft, c.text)}>
            <Icon className={compact ? 'size-4' : 'size-5'} />
          </div>
        ) : null}
      </div>
      <span className={cn('absolute inset-x-0 bottom-0 h-0.5', c.dot)} />
    </Card>
  );
}
