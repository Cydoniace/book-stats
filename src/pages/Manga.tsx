import { Fragment, useMemo, useState } from 'react';
import { useData, useYears } from '../App';
import { BarChart, percent } from '../components/Charts';
import { Card, CountTable, Datalist, Field, Modal, Pct, Rating, Tile, YearSelect } from '../components/ui';
import { fmt, fmt2, label, plural, LANGUAGES, MONTHS, MONTHS_SHORT } from '../lib/format';
import { avg, byMonth, countBy, median, ratingHist } from '../lib/stats';
import type { Manga, NewRow } from '../lib/types';

export const MANGA_KINDS = ['манга', 'манхва', 'манхуа'] as const;
const KIND_HINT: Record<string, string> = { 'манга': 'манга', 'манхва': 'манхва', 'манхуа': 'манхуа' };
const genreTags = (g: string) => g.toLowerCase().split(/[,;/]+|\s{2,}/).map((x) => x.trim()).filter(Boolean);

export default function MangaPage() {
  const { db, save } = useData();
  const years = useYears(db.manga);
  const { year, setYear } = useData();
  const [view, setView] = useState<'stats' | 'list'>('stats');
  const [q, setQ] = useState('');
  const [dl, setDl] = useState<'all' | 'yes' | 'no'>('all');
  const [kind, setKind] = useState('');
  const [edit, setEdit] = useState<Manga | 'new' | null>(null);
  const mm = useMemo(() => db.manga.filter((m) => year === 'all' || m.year === year), [db.manga, year]);
  const ratings = mm.map((m) => m.rating).filter((r): r is number => r != null);
  const chapters = mm.reduce((a, m) => a + (m.chapters ?? 0), 0);
  const downloaded = mm.filter((m) => m.downloaded).length;
  const bars = (rows: [string, number][], map?: Record<string, string>) => (
    <BarChart horizontal labels={rows.map(([k]) => (map ? label(map, k) : k))} series={[{ label: 'манги', data: rows.map(([, n]) => n) }]} total={mm.length} />
  );
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return mm.map((m, i) => ({ m, n: i + 1 }))
      .filter(({ m }) => (dl === 'all' || !!m.downloaded === (dl === 'yes')) && (!kind || m.kind === kind)
        && (!t || `${m.title} ${m.author} ${m.genre} ${m.notes} ${m.site}`.toLowerCase().includes(t)))
      .reverse();
  }, [mm, q, dl, kind]);
  const toggleDl = (m: Manga) => { const { id, ...rest } = m; save('manga', { ...rest, downloaded: !m.downloaded }, id); };
  const longest = mm.filter((m) => m.chapters).sort((a, b) => b.chapters! - a.chapters!).slice(0, 5);

  return (
    <>
      <div className="toolbar">
        <YearSelect years={years} value={year} onChange={setYear} all />
        <div className="seg">
          <button className={view === 'stats' ? 'on' : ''} onClick={() => setView('stats')}>статистика</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>список</button>
        </div>
        <button className="primary" onClick={() => setEdit('new')}>＋ Манга</button>
      </div>
      {view === 'stats' ? (
        !mm.length ? <p className="muted empty-note">За этот год манги пока нет — самое время начать! 🎴✨</p> : (
        <>
          <div className="tiles">
            <Tile icon="🎴" label="Тайтлов" value={fmt(mm.length)} hint={MANGA_KINDS.map((k) => `${k} ${mm.filter((m) => m.kind === k).length}`).join(' · ')} />
            <Tile icon="📑" label="Глав" value={fmt(chapters)} hint={mm.some((m) => m.chapters) ? `≈ ${fmt(Math.round(chapters / mm.filter((m) => m.chapters).length))} на тайтл` : 'главы пока не указаны'} />
            <Tile icon="⭐" label="Средняя оценка" value={fmt2(avg(ratings))} hint={`медиана ${fmt2(median(ratings))}`} />
            <Tile icon="📥" label="Скачано" value={<>{fmt(downloaded)}<span className="tile-pct">{percent(downloaded, mm.length)}</span></>} hint={<>не скачано {mm.length - downloaded}<Pct n={mm.length - downloaded} of={mm.length} /></>} />
          </div>
          <div className="grid">
            <Card title="🗓 По месяцам"><BarChart labels={MONTHS_SHORT} series={[{ label: 'манги', data: byMonth(mm) }]} total={mm.length} /></Card>
            <Card title="📑 Глав по месяцам"><BarChart labels={MONTHS_SHORT} series={[{ label: 'глав', data: byMonth(mm, (m) => m.chapters ?? 0) }]} total={chapters} format={fmt} /></Card>
            <Card title="🎴 Манга, манхва, манхуа">{bars(countBy(mm, (m) => m.kind), KIND_HINT)}</Card>
            <Card title="⭐ Оценки"><BarChart labels={ratingHist(mm).map((_, i) => String(i))} series={[{ label: 'манги', data: ratingHist(mm) }]} total={mm.length} /></Card>
            <Card title="🎀 Жанры">
              {bars(countBy(mm, (m) => genreTags(m.genre)))}
              <p className="muted small">Тайтл с несколькими жанрами считается в каждом из них.</p>
            </Card>
            <Card title="🌐 Сайты">{bars(countBy(mm, (m) => m.site))}</Card>
            <Card title="💬 Язык">{bars(countBy(mm, (m) => m.language), LANGUAGES)}</Card>
            <Card title="🏆 Больше всего глав">
              {longest.length ? <CountTable head={['Тайтл', 'Глав']} rows={longest.map((m) => [m.title, fmt(m.chapters!)])} /> : <p className="muted small">Главы пока не указаны.</p>}
            </Card>
          </div>
        </>)
      ) : (
        <>
          <div className="toolbar">
            <input className="search" placeholder="Поиск: название, автор, жанр, пометки…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Тип">
              <option value="">все типы</option>
              {MANGA_KINDS.map((k) => <option key={k} value={k}>{KIND_HINT[k]}</option>)}
            </select>
            <div className="seg">
              <button className={dl === 'all' ? 'on' : ''} onClick={() => setDl('all')}>все</button>
              <button className={dl === 'yes' ? 'on' : ''} onClick={() => setDl('yes')}>📥 скачаны</button>
              <button className={dl === 'no' ? 'on' : ''} onClick={() => setDl('no')}>не скачаны</button>
            </div>
          </div>
          <p className="muted small">Показано {list.length} из {mm.length} · скачано {downloaded}. Галочку можно нажимать прямо в таблице.</p>
          <div className="table-wrap scroll">
            <table className="list">
              <thead><tr><th>№</th><th>Месяц</th><th className="title-h">Название</th><th title="Скачана">📥 Скачана</th><th>Автор</th><th>Тип</th><th className="num">Глав</th><th className="num">Оценка</th><th>Язык</th><th>Сайт</th><th>Жанр</th><th>Пометки</th></tr></thead>
              <tbody>
                {list.map(({ m, n }, i) => {
                  const prev = list[i - 1]?.m;
                  const newMonth = !prev || prev.month !== m.month || prev.year !== m.year;
                  const inMonth = newMonth ? list.filter((r) => r.m.year === m.year && r.m.month === m.month).length : 0;
                  return (<Fragment key={m.id}>
                  {newMonth && (
                    <tr className="month-sep"><td colSpan={12}><span>{m.month ? MONTHS[m.month - 1] : 'без месяца'}{year === 'all' ? ` ${m.year}` : ''} <small>· {inMonth} {plural(inMonth, 'тайтл', 'тайтла', 'тайтлов')}</small></span></td></tr>
                  )}
                  <tr onClick={() => setEdit(m)}>
                    <td className="muted">{year === 'all' ? `${m.year}·${n}` : n}</td>
                    <td>{m.month ? MONTHS_SHORT[m.month - 1] : ''}</td>
                    <td className="title">{m.title}</td>
                    <td className="dl-cell" onClick={(e) => { e.stopPropagation(); toggleDl(m); }} title={m.downloaded ? 'Скачана — нажмите, чтобы снять' : 'Не скачана — нажмите, чтобы отметить'}><span className={'dl' + (m.downloaded ? ' on' : '')}>{m.downloaded ? '✓' : ''}</span></td>
                    <td>{m.author}</td><td>{m.kind && <span className="tag">{KIND_HINT[m.kind] ?? m.kind}</span>}</td>
                    <td className="num"><b>{m.chapters ?? ''}</b></td><td className="num"><Rating v={m.rating} /></td>
                    <td>{m.language}</td><td>{m.site}</td><td>{m.genre}</td><td className="notes">{m.notes}</td>
                  </tr>
                  </Fragment>);
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {edit && <MangaForm item={edit === 'new' ? null : edit} defYear={year === 'all' ? years[0] : year} onClose={() => setEdit(null)} />}
    </>
  );
}

function MangaForm({ item, defYear, onClose }: { item: Manga | null; defYear: number; onClose: () => void }) {
  const { db, save, remove } = useData();
  const [f, setF] = useState<NewRow<'manga'>>(() => {
    if (item) { const { id: _id, ...rest } = item; return rest; }
    const now = new Date();
    const last = db.manga.at(-1);
    return { year: defYear, month: defYear === now.getFullYear() ? now.getMonth() + 1 : 1, title: '', author: '', kind: last?.kind ?? 'манга', chapters: null, rating: null, language: last?.language ?? 'rus', site: last?.site ?? '', genre: '', notes: '', downloaded: false, first_time: true };
  });
  const [err, setErr] = useState('');
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const opts = (k: 'author' | 'site' | 'language' | 'genre') => [...new Set(db.manga.map((x) => x[k]).filter(Boolean))].sort();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await save('manga', f, item?.id); onClose(); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <Modal title={item ? '✏️ Изменить мангу' : '🎴 Новая манга'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Название" wide><input value={f.title} onChange={(e) => set('title', e.target.value)} required autoFocus /></Field>
        <Field label="Автор" wide><input list="dl-mauthor" value={f.author} onChange={(e) => set('author', e.target.value)} /></Field>
        <Field label="Тип">
          <select value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            {MANGA_KINDS.map((k) => <option key={k} value={k}>{KIND_HINT[k]}</option>)}
          </select>
        </Field>
        <Field label="Сколько глав"><input type="number" min={0} value={f.chapters ?? ''} onChange={(e) => set('chapters', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        <Field label="Год"><input type="number" value={f.year} onChange={(e) => set('year', Number(e.target.value))} /></Field>
        <Field label="Месяц">
          <select value={f.month ?? ''} onChange={(e) => set('month', e.target.value ? Number(e.target.value) : null)}>
            <option value="">—</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Оценка (0–10)"><input type="number" min={0} max={10} step={0.5} value={f.rating ?? ''} onChange={(e) => set('rating', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        <Field label="Язык"><input list="dl-mlang" value={f.language} onChange={(e) => set('language', e.target.value)} /></Field>
        <Field label="Сайт" wide><input list="dl-msite" value={f.site} onChange={(e) => set('site', e.target.value)} placeholder="например, remanga" /></Field>
        <Field label="Жанр (через запятую)" wide><input list="dl-mgenre" value={f.genre} onChange={(e) => set('genre', e.target.value)} placeholder="романтика, драма" /></Field>
        <Field label="Пометки" wide><textarea rows={4} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <div className="checks wide">
          <label><input type="checkbox" checked={!!f.downloaded} onChange={(e) => set('downloaded', e.target.checked)} /> 📥 скачана</label>
          <label><input type="checkbox" checked={f.first_time === false} onChange={(e) => set('first_time', !e.target.checked)} /> 🔁 перечитываю</label>
        </div>
        <Datalist id="dl-mauthor" values={opts('author')} /><Datalist id="dl-msite" values={opts('site')} />
        <Datalist id="dl-mlang" values={[...new Set([...Object.keys(LANGUAGES), ...opts('language')])]} /><Datalist id="dl-mgenre" values={opts('genre')} />
        {err && <p className="err-text wide">{err}</p>}
        <div className="actions wide">
          {item && <button type="button" className="danger" onClick={async () => { if (confirm(`Удалить «${item.title}»?`)) { await remove('manga', item.id); onClose(); } }}>Удалить</button>}
          <span className="spacer" />
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary">Сохранить</button>
        </div>
      </form>
    </Modal>
  );
}
