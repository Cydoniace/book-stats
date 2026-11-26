import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { emptyDb, missingTables, store, supabase } from './lib/store';
import type { Db, NewRow, Row, Table } from './lib/types';
import { applyTheme, themeFor, type Theme } from './lib/theme';
import Login from './pages/Login';
import BooksPage from './pages/Books';
import StatsPage from './pages/Stats';
import FanficsPage from './pages/Fanfics';
import MangaPage from './pages/Manga';
import ToReadPage from './pages/ToRead';
import ComparePage from './pages/Compare';
import DataPage from './pages/Data';

interface DataCtx {
  db: Db;
  save<T extends Table>(t: T, row: NewRow<T>, id?: number): Promise<void>;
  remove(t: Table, id: number): Promise<void>;
  reload(): Promise<void>;
  /** Выбранный год — общий для всех вкладок. */
  year: number | 'all';
  setYear(y: number | 'all'): void;
  theme: Theme;
  dark: boolean;
}
const Ctx = createContext<DataCtx>(null!);
export const useData = () => useContext(Ctx);

const TABS = [
  ['books', '📖 Книги'], ['stats', '📊 Статистика'], ['fanfics', '💌 Фанфики'], ['manga', '🎴 Манга'], ['toread', '🌱 To read'], ['compare', '🗓 По годам'], ['data', '💾 Данные'],
] as const;
type Tab = (typeof TABS)[number][0];
const tabFromHash = (): Tab => (TABS.find(([k]) => '#' + k === location.hash)?.[0] ?? 'books');

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [db, setDb] = useState<Db>(emptyDb);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [startEmpty, setStartEmpty] = useState(false);
  const [year, setYear] = useState<number | 'all'>(new Date().getFullYear());
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  // цвет года — на вкладках, где выбран год; остальные — розовые
  const yearTab = tab === 'books' || tab === 'stats' || tab === 'fanfics' || tab === 'manga';
  const theme = useMemo(() => themeFor(yearTab ? year : 'all', dark), [yearTab, year, dark]);
  useEffect(() => applyTheme(theme), [theme]);

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
    <Ctx.Provider value={{ db, save, remove, reload, year, setYear, theme, dark }}>
      <header className="top">
        <div className="brand"><span className="brand-emoji">{theme.emoji}</span> Книжная статистика</div>
        <nav>
          {TABS.map(([k, name]) => (
            <a key={k} href={'#' + k} className={tab === k ? 'on' : ''}>{name}</a>
          ))}
        </nav>
      </header>
      {store.mode === 'local' && (
        <div className="banner">Демо-режим: данные хранятся только в этом браузере. Чтобы хранить их в облаке, заполните <code>config.js</code> (см. README).</div>
      )}
      {store.mode === 'cloud' && db.fanfics.length > 0 && !('downloaded' in db.fanfics[0]) && (
        <div className="banner err">В базе ещё нет поля «скачан» у фанфиков, поэтому галочки не сохраняются. Выполните в Supabase → SQL Editor запрос из файла <code>fanfics-downloaded.sql</code>.</div>
      )}
      {missingTables.includes('manga') && (
        <div className="banner err">В базе ещё нет таблицы для манги. Выполните в Supabase → SQL Editor запрос из файла <code>manga.sql</code> — он создаст таблицу и перенесёт мангу из книг.</div>
      )}
      {error && <div className="banner err">Ошибка загрузки: {error} <button onClick={reload}>Повторить</button></div>}
      <main>
        {loading && !db.books.length ? <p className="muted loading">Загружаю книжки… 🌷</p> : !db.books.length && !db.fanfics.length && !db.manga.length && !db.toread.length && tab !== 'data' && !startEmpty ? (
          <div className="card empty">
            <div className="empty-emoji">🧸📚</div>
            <h2>Здесь пока пусто</h2>
            <p>В базе ещё нет ни одной книги. Чтобы перенести данные из Google-таблицы, откройте раздел <b>Данные</b> и в блоке «Импорт» выберите файл <code>import-from-sheet.json</code>.</p>
            {store.mode === 'local' && <p className="muted small">Сайт сейчас в демо-режиме: импорт сохранится только в этом браузере на этом устройстве.</p>}
            <div className="actions"><a className="btn primary" href="#data">Перейти к импорту</a><button onClick={() => setStartEmpty(true)}>Начать с нуля</button></div>
          </div>
        ) : (
          <>
            {tab === 'books' && <BooksPage />}
            {tab === 'stats' && <StatsPage />}
            {tab === 'fanfics' && <FanficsPage />}
            {tab === 'manga' && <MangaPage />}
            {tab === 'toread' && <ToReadPage />}
            {tab === 'compare' && <ComparePage />}
            {tab === 'data' && <DataPage />}
          </>
        )}
      </main>
      <footer className="foot">сделано с 💗 для любимых книжек</footer>
    </Ctx.Provider>
  );
}

/** Годы, которые есть в данных, плюс текущий — по убыванию. */
export function useYears(rows: { year: number }[]) {
  const ys = new Set(rows.map((r) => r.year));
  ys.add(new Date().getFullYear());
  return [...ys].sort((a, b) => b - a);
}
