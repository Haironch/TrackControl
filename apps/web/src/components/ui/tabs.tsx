import { cn } from '@/lib/utils';

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; count?: number }[];
  className?: string;
}

export function Tabs<T extends string>({ value, onChange, items, className }: TabsProps<T>) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 scrollbar-none', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === item.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span className={cn('rounded-full px-1.5 text-[10px] tabular', value === item.value ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600')}>{item.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
