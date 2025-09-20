import * as React from 'react';
import clsx from 'clsx';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'icon';
}
const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-9 px-4 py-2';
const variants: Record<string,string> = {
  default: 'bg-slate-900 text-white hover:bg-slate-800',
  outline: 'border border-slate-300 hover:bg-slate-100',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  ghost: 'hover:bg-slate-100',
  destructive: 'bg-red-600 text-white hover:bg-red-500'
};
const sizes: Record<string,string> = {
  default: 'h-9 px-4 py-2',
  icon: 'h-9 w-9 p-0'
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant='default', size='default', ...props}, ref){
  return <button ref={ref} className={clsx(base, variants[variant], sizes[size], className)} {...props} />
});
