import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
        primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
        secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 shadow-sm hover:bg-slate-50',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        outline: 'border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
        link: 'text-brand-700 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 text-sm [&_svg]:size-4',
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        lg: 'h-10 px-5 text-sm [&_svg]:size-4',
        icon: 'size-9 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading, children, disabled, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
    {loading ? <Loader2 className="animate-spin" /> : null}
    {children}
  </button>
));
Button.displayName = 'Button';

export { buttonVariants };
