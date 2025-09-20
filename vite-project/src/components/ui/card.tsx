import * as React from 'react';
import clsx from 'clsx';
export const Card = ({ className='', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('rounded-xl border bg-white text-slate-900 shadow-sm', className)} {...props} />
);
export const CardHeader = ({ className='', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('p-4 pb-0 space-y-1', className)} {...props} />
);
export const CardTitle = ({ className='', ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={clsx('font-semibold leading-none tracking-tight', className)} {...props} />
);
export const CardContent = ({ className='', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('p-4 pt-2', className)} {...props} />
);
