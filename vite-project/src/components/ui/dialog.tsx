import * as React from 'react';
import clsx from 'clsx';
// Very small headless dialog implementation using native <dialog>
export interface DialogRootProps { children: React.ReactNode; open: boolean; onOpenChange: (o:boolean)=>void; }
export function Dialog({ children, open, onOpenChange }: DialogRootProps){
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}
const DialogContext = React.createContext<{open:boolean;onOpenChange:(o:boolean)=>void} | null>(null);
function useDlg(){ const ctx = React.useContext(DialogContext); if(!ctx) throw new Error('Dialog parts must be inside <Dialog>'); return ctx; }
export const DialogTrigger: React.FC<{ asChild?: boolean; children: React.ReactElement }> = ({ children }) => {
  const { onOpenChange } = useDlg();
  return React.cloneElement(children, { onClick: (e: any) => { children.props.onClick?.(e); onOpenChange(true); } });
};
export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className='', children, ...rest }) => {
  const { open, onOpenChange } = useDlg();
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={()=>onOpenChange(false)} />
      <div className={clsx('relative z-10 w-full max-w-md rounded-lg border bg-card text-card-foreground shadow-lg p-6 animate-in fade-in', className)} {...rest}>
        {children}
      </div>
    </div>
  );
};
export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className='', ...p }) => <div className={clsx('space-y-1 mb-4', className)} {...p} />
export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className='', ...p }) => <h3 className={clsx('text-lg font-semibold text-foreground', className)} {...p} />
export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className='', ...p }) => <div className={clsx('flex justify-end gap-2 mt-6', className)} {...p} />
