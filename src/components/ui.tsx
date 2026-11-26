import { ReactNode, useEffect } from 'react';
import { useData } from '../App';
import { themeFor } from '../lib/theme';

export function Tile({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: string }) {
  return (
    <div className="tile">
      {icon && <div className="tile-icon" aria-hidden>{icon}</div>}
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
  const { dark } = useData();
  const style = (y: number | 'all') => {
    const t = themeFor(y, dark);
    return { '--y-soft': t.soft, '--y-accent': t.accent, '--y-bar': t.bar } as React.CSSProperties;
  };
  return (
    <div className="years" role="tablist">
      {all && <button style={style('all')} className={value === 'all' ? 'on' : ''} onClick={() => onChange('all')}>✨ все годы</button>}
      {years.map((y) => (
        <button key={y} style={style(y)} className={value === y ? 'on' : ''} onClick={() => onChange(y)}>{themeFor(y, dark).emoji} {y}</button>
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

/** Оценка в кружочке: 10 — с сердечком. */
export function Rating({ v }: { v: number | null }) {
  if (v == null) return null;
  return <span className={'rating' + (v >= 9 ? ' hi' : v <= 5 ? ' lo' : '')}>{v}{v >= 10 ? ' 💖' : ''}</span>;
}

/** Небольшой процент рядом с числом: «· 66%». */
export function Pct({ n, of }: { n: number; of: number }) {
  if (!of) return null;
  const p = (n / of) * 100;
  return <span className="pct"> · {p > 0 && p < 1 ? '<1' : Math.round(p)}%</span>;
}
