import { ReactNode, useEffect } from 'react';

export function Tile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  );
}

export function Card({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={'card' + (wide ? ' wide' : '')}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function YearSelect({ years, value, onChange, all }: { years: number[]; value: number | 'all'; onChange: (y: number | 'all') => void; all?: boolean }) {
  return (
    <div className="seg" role="tablist">
      {all && <button className={value === 'all' ? 'on' : ''} onClick={() => onChange('all')}>все годы</button>}
      {years.map((y) => (
        <button key={y} className={value === y ? 'on' : ''} onClick={() => onChange(y)}>{y}</button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="ghost" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Поле ввода с подсказками из уже введённых значений. */
export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={'field' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Datalist({ id, values }: { id: string; values: string[] }) {
  return <datalist id={id}>{values.map((v) => <option key={v} value={v} />)}</datalist>;
}

/** Таблица «название — количество» для длинных списков. */
export function CountTable({ rows, head }: { rows: [string, ReactNode][]; head: [string, string] }) {
  return (
    <table className="mini">
      <thead><tr><th>{head[0]}</th><th className="num">{head[1]}</th></tr></thead>
      <tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>)}</tbody>
    </table>
  );
}
