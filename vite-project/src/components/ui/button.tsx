import * as React from 'react';
import clsx from 'clsx';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'icon' | 'lg' | 'sm';
}
const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
const variants: Record<string,string> = {
  default: 'bg-primary text-primary-foreground hover:brightness-95',
  outline: 'border border-border bg-transparent text-foreground hover:bg-accent',
  secondary: 'bg-secondary text-secondary-foreground hover:brightness-95',
  ghost: 'hover:bg-accent',
  destructive: 'bg-destructive text-destructive-foreground hover:brightness-95'
};
const sizes: Record<string,string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 px-3 py-1 text-xs',
  lg: 'h-11 px-6 py-3 text-base',
  icon: 'h-9 w-9 p-0'
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant='default', size='default', ...props}, ref){
  return <button ref={ref} className={clsx(base, variants[variant], sizes[size], className)} {...props} />
});
