import { cn, initials } from '@/lib/utils';

export function Avatar({ name, color, size = 'md', className }: { name: string; color?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-10 text-sm' };
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', sizes[size], className)}
      style={{ backgroundColor: color ?? '#475569' }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
