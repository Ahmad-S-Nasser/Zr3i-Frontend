import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/** A button that opens a small panel under it. Closes on Escape, on a click outside, and when focus leaves. */
export function Popover({ label, trigger, children, badge }: { label: string; trigger: ReactNode; children: (close: () => void) => ReactNode; badge?: number }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={root} className="zr-pop">
      <button type="button" className="zr-iconbtn" aria-label={label} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        {trigger}
        {badge ? <span className="zr-badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</span> : null}
      </button>
      {open ? <div id={panelId} className="zr-pop-panel">{children(() => setOpen(false))}</div> : null}
    </div>
  );
}
