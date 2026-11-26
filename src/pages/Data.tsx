import { useRef, useState } from 'react';
import { useData } from '../App';
import { Card } from '../components/ui';
import { store, supabase } from '../lib/store';
import type { Db, Table } from '../lib/types';

const TABLES: Table[] = ['books', 'fanfics', 'toread'];

export default function DataPage() {
  const { db, reload } = useData();
  const file = useRef<HTMLInputElement>(null);
  const [replace, setReplace] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const exportJson = () => {
    const strip = (rows: { id: number }[]) => rows.map(({ id: _id, ...r }) => r);
    const out = { version: 1, exported: new Date().toISOString(), books: strip(db.books), fanfics: strip(db.fanfics), toread: strip(db.toread) };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
    a.download = `backup-books-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (f: File) => {
    setBusy(true); setMsg('');
    try {
      const data = JSON.parse(await f.text()) as Partial<Db>;
      const n = TABLES.map((t) => `${t}: ${data[t]?.length ?? 0}`).join(', ');
      if (!TABLES.some((t) => data[t]?.length)) throw new Error('в файле нет записей');
      if (replace && !confirm(`Все текущие данные будут заменены содержимым файла (${n}). Продолжить?`)) { setBusy(false); return; }
      const strip = <T extends { id?: number }>(rows: T[] = []) => rows.map(({ id: _id, ...r }) => r);
      await store.bulk({ books: strip(data.books), fanfics: strip(data.fanfics), toread: strip(data.toread) } as never, replace);
      await reload();
      setMsg(`Готово, загружено — ${n}`);
    } catch (e) { setMsg('Ошибка: ' + (e as Error).message); }
    setBusy(false);
    if (file.current) file.current.value = '';
  };

  return (
    <div className="grid">
      <Card title="Резервная копия">
        <p>Сейчас в базе: книг <b>{db.books.length}</b>, фанфиков <b>{db.fanfics.length}</b>, to read <b>{db.toread.length}</b>.</p>
        <p className="muted small">Файл со всеми данными в формате JSON. Его можно загрузить обратно через импорт.</p>
        <button className="primary" onClick={exportJson}>Скачать копию</button>
      </Card>
      <Card title="Импорт">
        <p className="muted small">Загрузите файл резервной копии или файл, собранный из старой Google-таблицы (tools/sheet_to_json.py).</p>
        <div className="checks">
          <label><input type="radio" checked={replace} onChange={() => setReplace(true)} /> заменить всё</label>
          <label><input type="radio" checked={!replace} onChange={() => setReplace(false)} /> добавить к имеющимся</label>
        </div>
        <input ref={file} type="file" disabled={busy} onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        {busy && <p className="muted">Загрузка…</p>}
        {msg && <p>{msg}</p>}
      </Card>
      <Card title="Аккаунт">
        {supabase ? (
          <button onClick={() => supabase!.auth.signOut()}>Выйти</button>
        ) : (
          <p className="muted small">Демо-режим: данные лежат в этом браузере. Если очистить данные сайта, они пропадут — делайте резервные копии.</p>
        )}
      </Card>
    </div>
  );
}
