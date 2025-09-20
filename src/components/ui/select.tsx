import * as React from 'react';
import clsx from 'clsx';
interface RootCtx { value: string | undefined; setValue: (v:string)=>void; }
const Ctx = React.createContext<RootCtx | null>(null);
export const Select: React.FC<{ value: string; onValueChange:(v:string)=>void; children: React.ReactNode }> = ({ value, onValueChange, children }) => {
  return <Ctx.Provider value={{ value, setValue: onValueChange }}>{children}</Ctx.Provider>
};
export const SelectTrigger: React.FC<React.HTMLAttributes<HTMLButtonElement> & { placeholder?: string }> = ({ className='', children, placeholder, ...p }) => {
  const ctx = React.useContext(Ctx)!;
  const [open,setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button type="button" className={clsx('flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-1 text-sm', className)} {...p} onClick={()=>setOpen(o=>!o)}>
        {ctx.value ? <span>{ctx.value}</span> : <span className="text-slate-400">{placeholder || 'Select'}</span>}
        {children && <span className="sr-only">toggle</span>}
      </button>
      {open && <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-md" onKeyDown={(e)=>{ if(e.key==='Escape') setOpen(false); }}>{React.Children.map(children, child => React.isValidElement(child) ? React.cloneElement(child as any, { onSelect: () => setOpen(false) }) : child)}</div>}
    </div>
  );
};
export const SelectContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className='', ...p }) => <div className={clsx('p-1 max-h-64 overflow-auto', className)} {...p} />
export const SelectItem: React.FC<{ value: string; children: React.ReactNode; onSelect?: ()=>void }> = ({ value, children, onSelect }) => {
  const ctx = React.useContext(Ctx)!;
  return (
    <div
      role="option"
      onClick={()=>{ ctx.setValue(value); onSelect?.(); }}
      className={clsx('cursor-pointer select-none rounded px-2 py-1 text-sm hover:bg-slate-100', ctx.value===value && 'bg-slate-200 font-medium')}
    >{children}</div>
  );
};
export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = React.useContext(Ctx)!; return <span>{ctx.value || placeholder || 'Select'}</span>;
};
