import { useMemo, useState } from 'react';
import { useData } from '../App';
import { Field, Modal } from '../components/ui';
import type { NewRow, ToRead } from '../lib/types';

export default function ToReadPage() {
  const { db, save } = useData();
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<'all' | 'yes' | 'no'>('all');
  const [edit, setEdit] = useState<ToRead | 'new' | null>(null);
  const [pick, setPick] = useState<ToRead | null>(null);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.toread.filter((r) => (only === 'all' || r.downloaded === (only === 'yes')) && (!t || `${r.title} ${r.author} ${r.comment}`.toLowerCase().includes(t)));
  }, [db.toread, q, only]);
  const random = () => setPick(list[Math.floor(Math.random() * list.length)] ?? null);
  const toggle = (r: ToRead) => { const { id, ...rest } = r; save('toread', { ...rest, downloaded: !r.downloaded }, id); };

  return (
    <>
      <div className="toolbar">
        <input className="search" placeholder="Поиск…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">
          <button className={only === 'all' ? 'on' : ''} onClick={() => setOnly('all')}>все</button>
          <button className={only === 'yes' ? 'on' : ''} onClick={() => setOnly('yes')}>скачаны</button>
          <button className={only === 'no' ? 'on' : ''} onClick={() => setOnly('no')}>не скачаны</button>
        </div>
        <button onClick={random} disabled={!list.length}>🎲 Случайная книга</button>
        <button className="primary" onClick={() => setEdit('new')}>＋ Книга</button>
      </div>
      {pick && (
        <div className="pick card">
          <div className="muted small">🎲 Сегодня читаем:</div>
          <div className="pick-title">{pick.title}</div>
          <div>{pick.author}{pick.comment && <span className="muted"> · {pick.comment}</span>}</div>
          <div className="actions"><button onClick={random}>Ещё раз</button><button className="ghost" onClick={() => setPick(null)}>Скрыть</button></div>
        </div>
      )}
      <p className="muted small">{list.length} из {db.toread.length} · скачано {db.toread.filter((r) => r.downloaded).length}</p>
      <div className="table-wrap scroll">
        <table className="list">
          <thead><tr><th>№</th><th className="title-h">Название</th><th>Автор</th><th>Комментарий</th><th>Скачана</th></tr></thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={r.id} onClick={() => setEdit(r)}>
                <td className="muted">{i + 1}</td><td className="title">{r.title}</td><td>{r.author}</td>
                <td>{r.comment}{r.note && <span className="muted"> · {r.note}</span>}</td>
                <td onClick={(e) => { e.stopPropagation(); toggle(r); }}><input type="checkbox" checked={r.downloaded} readOnly aria-label="скачана" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <ToReadForm item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function ToReadForm({ item, onClose }: { item: ToRead | null; onClose: () => void }) {
  const { save, remove } = useData();
  const [f, setF] = useState<NewRow<'toread'>>(() => {
    if (item) { const { id: _id, ...rest } = item; return rest; }
    return { title: '', author: '', comment: '', downloaded: false, note: '' };
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal title={item ? '✏️ Изменить' : '🌱 Хочу прочитать'} onClose={onClose}>
      <form className="form" onSubmit={async (e) => { e.preventDefault(); await save('toread', f, item?.id); onClose(); }}>
        <Field label="Название" wide><input value={f.title} onChange={(e) => set('title', e.target.value)} required autoFocus /></Field>
        <Field label="Автор" wide><input value={f.author} onChange={(e) => set('author', e.target.value)} /></Field>
        <Field label="Комментарий (откуда узнала)" wide><input value={f.comment} onChange={(e) => set('comment', e.target.value)} /></Field>
        <Field label="Заметка" wide><input value={f.note} onChange={(e) => set('note', e.target.value)} /></Field>
        <div className="checks wide"><label><input type="checkbox" checked={f.downloaded} onChange={(e) => set('downloaded', e.target.checked)} /> скачана</label></div>
        <div className="actions wide">
          {item && <button type="button" className="danger" onClick={async () => { if (confirm(`Удалить «${item.title}»?`)) { await remove('toread', item.id); onClose(); } }}>Удалить</button>}
          <span className="spacer" />
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary">Сохранить</button>
        </div>
      </form>
    </Modal>
  );
}
