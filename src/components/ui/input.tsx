import * as React from 'react';
import clsx from 'clsx';
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className='', ...props }, ref){
  return <input ref={ref} className={clsx('flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2', className)} {...props} />
});
