import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { emptyDb, store, supabase } from './lib/store';
import type { Db, NewRow, Row, Table } from './lib/types';
import Login from './pages/Login';
import BooksPage from './pages/Books';
import StatsPage from './pages/Stats';
import FanficsPage from './pages/Fanfics';
import ToReadPage from './pages/ToRead';
import ComparePage from './pages/Compare';
import DataPage from './pages/Data';

interface DataCtx {
  db: Db;
  save<T extends Table>(t: T, row: NewRow<T>, id?: number): Promise<void>;
  remove(t: Table, id: number): Promise<void>;
  reload(): Promise<void>;
}
const Ctx = createContext<DataCtx>(null!);
export const useData = () => useContext(Ctx);

const TABS = [
  ['books', 'Книги'], ['stats', 'Статистика'], ['fanfics', 'Фанфики'], ['toread', 'To read'], ['compare', 'По годам'], ['data', 'Данные'],
] as const;
type Tab = (typeof TABS)[number][0];
const tabFromHash = (): Tab => (TABS.find(([k]) => '#' + k === location.hash)?.[0] ?? 'books');

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [db, setDb] = useState<Db>(emptyDb);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    const on = () => setTab(tabFromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try { setDb(await store.load()); setError(''); } catch (e) { setError(String((e as Error).message)); }
    setLoading(false);
  }, []);

  const signedIn = !supabase || !!session;
  useEffect(() => { if (signedIn) reload(); }, [signedIn, reload]);

  const save = useCallback(async <T extends Table>(t: T, row: NewRow<T>, id?: number) => {
    const r = id ? await store.update(t, id, row) : await store.insert(t, row);
    setDb((d) => ({ ...d, [t]: id ? (d[t] as Row<T>[]).map((x) => (x.id === id ? r : x)) : [...d[t], r] }));
  }, []);
  const remove = useCallback(async (t: Table, id: number) => {
    await store.remove(t, id);
    setDb((d) => ({ ...d, [t]: (d[t] as { id: number }[]).filter((x) => x.id !== id) }));
  }, []);

  if (session === undefined) return null;
  if (!signedIn) return <Login />;

  return (
    <Ctx.Provider value={{ db, save, remove, reload }}>
      <header className="top">
        <div className="brand">📚 Книжная статистика</div>
        <nav>
          {TABS.map(([k, name]) => (
            <a key={k} href={'#' + k} className={tab === k ? 'on' : ''}>{name}</a>
          ))}
        </nav>
      </header>
      {store.mode === 'local' && (
        <div className="banner">Демо-режим: данные хранятся только в этом браузере. Чтобы хранить их в облаке, заполните <code>config.js</code> (см. README).</div>
      )}
      {error && <div className="banner err">Ошибка загрузки: {error} <button onClick={reload}>Повторить</button></div>}
      <main>
        {loading && !db.books.length ? <p className="muted">Загрузка…</p> : (
          <>
            {tab === 'books' && <BooksPage />}
            {tab === 'stats' && <StatsPage />}
            {tab === 'fanfics' && <FanficsPage />}
            {tab === 'toread' && <ToReadPage />}
            {tab === 'compare' && <ComparePage />}
            {tab === 'data' && <DataPage />}
          </>
        )}
      </main>
    </Ctx.Provider>
  );
}

/** Годы, которые есть в данных, плюс текущий — по убыванию. */
export function useYears(rows: { year: number }[]) {
  const ys = new Set(rows.map((r) => r.year));
  ys.add(new Date().getFullYear());
  return [...ys].sort((a, b) => b - a);
}
