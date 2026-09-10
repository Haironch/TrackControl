import type { LucideIcon } from 'lucide-react';
import { PackageSearch } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ icon: Icon = PackageSearch, title, description, action }: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="size-6" />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="max-w-sm text-xs text-slate-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
