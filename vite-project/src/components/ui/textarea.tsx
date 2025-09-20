import * as React from 'react';
import clsx from 'clsx';
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className='', ...props }, ref){
  return <textarea ref={ref} className={clsx('flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2', className)} {...props} />
});
