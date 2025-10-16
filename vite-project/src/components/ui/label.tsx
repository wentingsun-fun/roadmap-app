import * as React from 'react';
import clsx from 'clsx';
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className='', ...p }) => (
  <label className={clsx('text-sm font-medium leading-none text-foreground/80 peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)} {...p} />
);
