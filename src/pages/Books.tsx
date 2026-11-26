import { Fragment, useMemo, useState } from 'react';
import { useData, useYears } from '../App';
import { Datalist, Field, Modal, Rating, YearSelect } from '../components/ui';
import { ddmm, FORMATS, label, plural, LANGUAGES, MONTHS, MONTHS_SHORT, periodFromYear, periodLabel } from '../lib/format';
import type { Book, NewRow } from '../lib/types';

type SortKey = 'order' | 'title' | 'author' | 'rating' | 'pages';

export default function BooksPage() {
  const { db } = useData();
  const years = useYears(db.books);
  const { year, setYear } = useData();
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState<{ k: SortKey; desc: boolean }>({ k: 'order', desc: true });
  const [edit, setEdit] = useState<Book | 'new' | null>(null);

  const inYear = useMemo(() => db.books.filter((b) => year === 'all' || b.year === year), [db.books, year]);
  const genres = useMemo(() => [...new Set(inYear.map((b) => b.genre).filter(Boolean))].sort(), [inYear]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = inYear
      .map((b, i) => ({ b, n: i + 1 }))
      .filter(({ b }) => (!genre || b.genre === genre) && (!s || `${b.title} ${b.author} ${b.country} ${b.source}`.toLowerCase().includes(s)));
    const val = ({ b, n }: { b: Book; n: number }) =>
      sort.k === 'order' ? b.year * 1e4 + n : sort.k === 'title' ? b.title.toLowerCase() : sort.k === 'author' ? b.author.toLowerCase() : (b[sort.k] ?? -1);
    return list.sort((x, y) => (val(x) < val(y) ? -1 : val(x) > val(y) ? 1 : 0) * (sort.desc ? -1 : 1));
  }, [inYear, q, genre, sort]);

  const th = (k: SortKey, text: string, cls = '') => (
    <th className={'sort ' + cls} onClick={() => setSort((s) => ({ k, desc: s.k === k ? !s.desc : k !== 'title' && k !== 'author' }))}>
      {text}{sort.k === k ? (sort.desc ? ' ↓' : ' ↑') : ''}
    </th>
  );

  return (
    <>
      <div className="toolbar">
        <YearSelect years={years} value={year} onChange={setYear} all />
        <input className="search" placeholder="Поиск: название, автор, страна…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Жанр">
          <option value="">все жанры</option>
          {genres.map((g) => <option key={g}>{g}</option>)}
        </select>
        <button className="primary" onClick={() => setEdit('new')}>＋ Книга</button>
      </div>
      <p className="muted small">Показано {rows.length} из {inYear.length}. Нажмите на строку, чтобы изменить.</p>
      <div className="table-wrap scroll">
        <table className="list">
          <thead>
            <tr>
              {th('order', '№')}<th>Месяц</th><th>Даты</th><th className="pick-h" title="Любимая / нелюбимая книга месяца">💖</th>{th('title', 'Название', 'title-h')}{th('author', 'Автор')}{th('rating', 'Оценка', 'num')}
              <th>Жанр</th><th>Откуда</th><th>Язык</th><th>Страна</th><th>Год</th>{th('pages', 'Стр.', 'num')}<th>Формат</th><th title="Новый автор / перечитываю">Метки</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ b, n }, i) => {
              const prev = rows[i - 1]?.b;
              const newMonth = sort.k === 'order' && (!prev || prev.month !== b.month || prev.year !== b.year);
              const inMonth = newMonth ? rows.filter((r) => r.b.year === b.year && r.b.month === b.month).length : 0;
              return (<Fragment key={b.id}>
              {newMonth && (
                <tr className="month-sep"><td colSpan={15}><span>{b.month ? MONTHS[b.month - 1] : 'без месяца'}{year === 'all' ? ` ${b.year}` : ''} <small>· {inMonth} {plural(inMonth, 'книга', 'книги', 'книг')}</small></span></td></tr>
              )}
              <tr onClick={() => setEdit(b)}>
                <td className="muted">{year === 'all' ? `${b.year}·${n}` : n}</td>
                <td>{b.month ? MONTHS_SHORT[b.month - 1] : ''}</td>
                <td className="nowrap muted">{[b.start_date, b.end_date].filter((d, i, a) => d && a.indexOf(d) === i).map(ddmm).join('–')}</td>
                <td className="pickcol">{b.pick === 'fav' && <span title="Любимая книга месяца">💖</span>}{b.pick === 'worst' && <span title="Нелюбимая книга месяца">🥀</span>}</td>
                <td className="title">{b.title}</td>
                <td>{b.author}</td>
                <td className="num"><Rating v={b.rating} /></td>
                <td>{b.genre}</td>
                <td>{b.source}</td>
                <td>{b.language}</td>
                <td>{b.country}</td>
                <td className="muted">{b.pub_year}</td>
                <td className="num">{b.pages ?? ''}</td>
                <td>{label(FORMATS, b.format)}</td>
                <td className="nowrap">{b.new_author && <span className="tag">✨ новый автор</span>}{b.first_time === false && <span className="tag">🔁 перечитала</span>}</td>
              </tr>
              </Fragment>);
            })}
          </tbody>
        </table>
      </div>
      {edit && <BookForm book={edit === 'new' ? null : edit} defYear={year === 'all' ? years[0] : year} onClose={() => setEdit(null)} />}
    </>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function BookForm({ book, defYear, onClose }: { book: Book | null; defYear: number; onClose: () => void }) {
  const { db, save, remove } = useData();
  const [f, setF] = useState<NewRow<'books'>>(() => {
    if (book) { const { id: _id, ...rest } = book; return rest; }
    const now = new Date();
    return {
      year: defYear, month: defYear === now.getFullYear() ? now.getMonth() + 1 : 1, start_date: null, end_date: defYear === now.getFullYear() ? today() : null,
      title: '', author: '', rating: null, new_author: null, pub_year: '', period: null, genre: '', source: '', language: 'rus',
      country: '', pages: null, format: 'ebook', first_time: true, pick: null,
    };
  });
  const [periodTouched, setPeriodTouched] = useState(!!book && book.period !== periodFromYear(book.pub_year));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const opts = (k: 'author' | 'genre' | 'source' | 'country' | 'language' | 'format') =>
    [...new Set(db.books.map((b) => b[k]).filter(Boolean))].sort();
  const numOrNull = (v: string) => (v === '' ? null : Number(v.replace(',', '.')));

  // автор уже встречался раньше? — подсказка для «новый автор»
  const authorKnown = f.author && db.books.some((b) => b.id !== book?.id && b.author.toLowerCase() === f.author.toLowerCase());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const row = { ...f, new_author: f.new_author ?? !authorKnown };
      // в месяце может быть только одна любимая и одна нелюбимая книга
      if (row.pick) {
        for (const other of db.books.filter((b) => b.id !== book?.id && b.year === row.year && b.month === row.month && b.pick === row.pick)) {
          const { id, ...rest } = other;
          await save('books', { ...rest, pick: null }, id);
        }
      }
      await save('books', row, book?.id);
      onClose();
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <Modal title={book ? '✏️ Изменить книгу' : '📖 Новая книга'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Название" wide><input value={f.title} onChange={(e) => set('title', e.target.value)} required autoFocus /></Field>
        <Field label="Автор" wide><input list="dl-author" value={f.author} onChange={(e) => set('author', e.target.value)} /></Field>
        <Field label="Прочитана в году"><input type="number" value={f.year} onChange={(e) => set('year', Number(e.target.value))} required /></Field>
        <Field label="Месяц">
          <select value={f.month ?? ''} onChange={(e) => set('month', numOrNull(e.target.value))}>
            <option value="">—</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Начала"><input type="date" value={f.start_date ?? ''} onChange={(e) => set('start_date', e.target.value || null)} /></Field>
        <Field label="Закончила"><input type="date" value={f.end_date ?? ''} onChange={(e) => {
          const v = e.target.value || null;
          setF((x) => ({ ...x, end_date: v, ...(v && !book ? { month: Number(v.slice(5, 7)), year: Number(v.slice(0, 4)) } : {}) }));
        }} /></Field>
        <Field label="Оценка (0–10)"><input type="number" min={0} max={10} step={0.5} value={f.rating ?? ''} onChange={(e) => set('rating', numOrNull(e.target.value))} /></Field>
        <Field label="Страниц"><input type="number" min={0} value={f.pages ?? ''} onChange={(e) => set('pages', numOrNull(e.target.value))} /></Field>
        <Field label="Жанр"><input list="dl-genre" value={f.genre} onChange={(e) => set('genre', e.target.value)} /></Field>
        <Field label="Откуда узнала"><input list="dl-source" value={f.source} onChange={(e) => set('source', e.target.value)} /></Field>
        <Field label="Язык">
          <input list="dl-language" value={f.language} onChange={(e) => set('language', e.target.value)} />
        </Field>
        <Field label="Страна"><input list="dl-country" value={f.country} onChange={(e) => set('country', e.target.value)} /></Field>
        <Field label="Год издания"><input value={f.pub_year} onChange={(e) => {
          const v = e.target.value;
          setF((x) => ({ ...x, pub_year: v, ...(periodTouched ? {} : { period: periodFromYear(v) }) }));
        }} /></Field>
        <Field label="Эпоха (для статистики)">
          <select value={f.period ?? ''} onChange={(e) => { setPeriodTouched(true); set('period', numOrNull(e.target.value)); }}>
            <option value="">—</option>
            {[10, 11, 12, 13, 14, 15, 16, 17, 1700, 1750, ...Array.from({ length: 23 }, (_, i) => 1800 + i * 10)].map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
          </select>
        </Field>
        <Field label="Формат">
          <select value={f.format} onChange={(e) => set('format', e.target.value)}>
            {Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Книга месяца">
          <select value={f.pick ?? ''} onChange={(e) => set('pick', (e.target.value || null) as Book['pick'])}>
            <option value="">—</option><option value="fav">💖 любимая</option><option value="worst">🥀 нелюбимая</option>
          </select>
        </Field>
        <div className="checks wide">
          <label><input type="checkbox" checked={f.first_time === false} onChange={(e) => set('first_time', !e.target.checked)} /> перечитываю</label>
          <label><input type="checkbox" checked={f.new_author ?? !authorKnown} onChange={(e) => set('new_author', e.target.checked)} /> новый автор{f.new_author == null && f.author && <span className="muted small"> (определено автоматически)</span>}</label>
        </div>
        <Datalist id="dl-author" values={opts('author')} />
        <Datalist id="dl-genre" values={opts('genre')} />
        <Datalist id="dl-source" values={opts('source')} />
        <Datalist id="dl-country" values={opts('country')} />
        <Datalist id="dl-language" values={[...new Set([...Object.keys(LANGUAGES), ...opts('language')])]} />
        {err && <p className="err-text wide">{err}</p>}
        <div className="actions wide">
          {book && <button type="button" className="danger" onClick={async () => { if (confirm(`Удалить «${book.title}»?`)) { await remove('books', book.id); onClose(); } }}>Удалить</button>}
          <span className="spacer" />
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary" disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить'}</button>
        </div>
      </form>
    </Modal>
  );
}
