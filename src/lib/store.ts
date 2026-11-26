import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Db, NewRow, Row, Table } from './types';

declare global {
  interface Window { APP_CONFIG?: { supabaseUrl?: string; supabaseAnonKey?: string } }
}

const TABLES: Table[] = ['books', 'fanfics', 'manga', 'toread'];
/** Таблицы, которых ещё нет в базе Supabase (нужно выполнить SQL). */
export const missingTables: Table[] = [];

export const emptyDb = (): Db => ({ books: [], fanfics: [], manga: [], toread: [] });

export interface Store {
  mode: 'cloud' | 'local';
  load(): Promise<Db>;
  insert<T extends Table>(t: T, row: NewRow<T>): Promise<Row<T>>;
  update<T extends Table>(t: T, id: number, patch: Partial<NewRow<T>>): Promise<Row<T>>;
  remove(t: Table, id: number): Promise<void>;
  /** Добавить много записей (импорт). replace=true — сначала удалить всё. */
  bulk(db: { [K in Table]?: NewRow<K>[] }, replace: boolean): Promise<void>;
}

const cfg = window.APP_CONFIG ?? {};
export const supabase: SupabaseClient | null =
  cfg.supabaseUrl && cfg.supabaseAnonKey ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

// ---------- Supabase ----------
function cloudStore(sb: SupabaseClient): Store {
  const check = <T,>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };
  const strip = (row: object) => {
    const { id: _id, user_id: _u, created_at: _c, ...rest } = row as Record<string, unknown>;
    return rest;
  };
  return {
    mode: 'cloud',
    async load() {
      const db = emptyDb();
      for (const t of TABLES) {
        // Supabase отдаёт не больше 1000 строк за раз — читаем страницами
        for (let from = 0; ; from += 1000) {
          const res = await sb.from(t).select('*').order('id').range(from, from + 999);
          // таблицы, добавленные позже (манга), могут быть ещё не созданы в базе — тогда сайт работает без них
          if (res.error && t === 'manga' && /could not find the table|does not exist/i.test(res.error.message)) {
            if (!missingTables.includes(t)) missingTables.push(t);
            break;
          }
          const rows = check(res) as never[];
          (db[t] as unknown[]).push(...rows.map(strip).map((r, i) => ({ ...r, id: (rows[i] as { id: number }).id })));
          if (rows.length < 1000) break;
        }
      }
      return db;
    },
    async insert(t, row) {
      const r = check(await sb.from(t).insert(row as object).select().single());
      return { ...strip(r as object), id: (r as { id: number }).id } as never;
    },
    async update(t, id, patch) {
      const r = check(await sb.from(t).update(patch as object).eq('id', id).select().single());
      return { ...strip(r as object), id: (r as { id: number }).id } as never;
    },
    async remove(t, id) {
      check(await sb.from(t).delete().eq('id', id));
    },
    async bulk(db, replace) {
      for (const t of TABLES) {
        if (missingTables.includes(t)) {
          if ((db[t] ?? []).length) throw new Error('в базе ещё нет таблицы для манги — сначала выполните SQL из файла manga.sql');
          continue;
        }
        if (replace) check(await sb.from(t).delete().gt('id', 0));
        const rows = (db[t] ?? []) as object[];
        for (let i = 0; i < rows.length; i += 500) check(await sb.from(t).insert(rows.slice(i, i + 500)));
      }
    },
  };
}

// ---------- Браузер (демо-режим) ----------
const KEY = 'books-stats-v1';
function localStore(): Store {
  const read = (): Db => {
    try { return { ...emptyDb(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return emptyDb(); }
  };
  const write = (db: Db) => localStorage.setItem(KEY, JSON.stringify(db));
  const nextId = (db: Db) => Math.max(0, ...TABLES.flatMap((t) => db[t].map((r) => r.id))) + 1;
  return {
    mode: 'local',
    async load() { return read(); },
    async insert(t, row) {
      const db = read();
      const r = { ...row, id: nextId(db) } as Row<typeof t>;
      (db[t] as unknown[]).push(r);
      write(db);
      return r;
    },
    async update(t, id, patch) {
      const db = read();
      const list = db[t] as Row<typeof t>[];
      const i = list.findIndex((r) => r.id === id);
      list[i] = { ...list[i], ...patch };
      write(db);
      return list[i];
    },
    async remove(t, id) {
      const db = read();
      (db[t] as { id: number }[]) = db[t].filter((r) => r.id !== id);
      write(db);
    },
    async bulk(add, replace) {
      const db = replace ? emptyDb() : read();
      let id = nextId(db);
      for (const t of TABLES) for (const r of add[t] ?? []) (db[t] as unknown[]).push({ ...r, id: id++ });
      write(db);
    },
  };
}

export const store: Store = supabase ? cloudStore(supabase) : localStore();
