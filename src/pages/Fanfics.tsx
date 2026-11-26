import { Fragment, useMemo, useState } from 'react';
import { useData, useYears } from '../App';
import { BarChart, percent } from '../components/Charts';
import { Card, Datalist, Field, Modal, Pct, Rating, Tile, YearSelect } from '../components/ui';
import { fmt, fmt2, label, plural, LANGUAGES, MONTHS, MONTHS_SHORT } from '../lib/format';
import { byMonth, countBy, fanficSummary, ffGenreGroups, ratingHist } from '../lib/stats';
import type { Fanfic, NewRow } from '../lib/types';

export default function FanficsPage() {
  const { db, save } = useData();
  const years = useYears(db.fanfics);
  const { year, setYear } = useData();
  const [view, setView] = useState<'stats' | 'list'>('stats');
  const [q, setQ] = useState('');
  const [dl, setDl] = useState<'all' | 'yes' | 'no'>('all');
  const [edit, setEdit] = useState<Fanfic | 'new' | null>(null);
  const ff = useMemo(() => db.fanfics.filter((f) => year === 'all' || f.year === year), [db.fanfics, year]);
  const s = fanficSummary(ff);
  const groups = countBy(ff, (f) => ffGenreGroups(f.genre));
  const bars = (rows: [string, number][], map?: Record<string, string>) => (
    <BarChart horizontal labels={rows.map(([k]) => (map ? label(map, k) : k))} series={[{ label: 'фанфиков', data: rows.map(([, n]) => n) }]} total={ff.length} />
  );
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ff.map((f, i) => ({ f, n: i + 1 }))
      .filter(({ f }) => (dl === 'all' || !!f.downloaded === (dl === 'yes')) && (!t || `${f.title} ${f.fandom} ${f.genre} ${f.notes}`.toLowerCase().includes(t)))
      .reverse();
  }, [ff, q, dl]);
  const toggleDl = (f: Fanfic) => { const { id, ...rest } = f; save('fanfics', { ...rest, downloaded: !f.downloaded }, id); };
  const downloaded = ff.filter((f) => f.downloaded).length;

  return (
    <>
      <div className="toolbar">
        <YearSelect years={years} value={year} onChange={setYear} all />
        <div className="seg">
          <button className={view === 'stats' ? 'on' : ''} onClick={() => setView('stats')}>статистика</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>список</button>
        </div>
        <button className="primary" onClick={() => setEdit('new')}>＋ Фанфик</button>
      </div>
      {view === 'stats' ? (
        <>
          <div className="tiles">
            <Tile icon="💌" label="Фанфиков" value={fmt(s.count)} />
            <Tile icon="📥" label="Скачано" value={<>{fmt(downloaded)}<span className="tile-pct">{percent(downloaded, s.count)}</span></>} hint={<>не скачано {s.count - downloaded}<Pct n={s.count - downloaded} of={s.count} /></>} />
            <Tile icon="⭐" label="Средняя оценка" value={fmt2(s.avg)} hint={`медиана ${fmt2(s.median)}`} />
            <Tile icon="💜" label="Главный фандом" value={countBy(ff, (f) => f.fandom)[0]?.[0] ?? '—'} />
          </div>
          <div className="grid">
            <Card title="🗓 По месяцам"><BarChart labels={MONTHS_SHORT} series={[{ label: 'фанфиков', data: byMonth(ff) }]} total={ff.length} /></Card>
            <Card title="⭐ Оценки"><BarChart labels={ratingHist(ff).map((_, i) => String(i))} series={[{ label: 'фанфиков', data: ratingHist(ff) }]} total={ff.length} /></Card>
            <Card title="🎀 Жанры">
              {bars(groups)}
              <p className="muted small">Фанфик с несколькими жанрами считается в каждом из них, поэтому проценты в сумме больше 100%.</p>
            </Card>
            <Card title="🌐 Сайты">{bars(countBy(ff, (f) => f.site))}</Card>
            <Card title="💜 Фандомы">{bars(countBy(ff, (f) => f.fandom))}</Card>
            <Card title="💬 Язык">{bars(countBy(ff, (f) => f.language), LANGUAGES)}</Card>
          </div>
        </>
      ) : (
        <>
          <div className="toolbar">
            <input className="search" placeholder="Поиск: название, жанр, пометки…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="seg">
              <button className={dl === 'all' ? 'on' : ''} onClick={() => setDl('all')}>все</button>
              <button className={dl === 'yes' ? 'on' : ''} onClick={() => setDl('yes')}>📥 скачаны</button>
              <button className={dl === 'no' ? 'on' : ''} onClick={() => setDl('no')}>не скачаны</button>
            </div>
          </div>
          <p className="muted small">Показано {list.length} из {ff.length} · скачано {downloaded}. Галочку можно нажимать прямо в таблице.</p>
          <div className="table-wrap scroll">
            <table className="list">
              <thead><tr><th>№</th><th>Месяц</th><th className="title-h">Название</th><th title="Скачан">📥 Скачан</th><th>Фандом</th><th className="num">Оценка</th><th>Язык</th><th>Сайт</th><th>Жанр</th><th>Пометки</th></tr></thead>
              <tbody>
                {list.map(({ f, n }, i) => {
                  const prev = list[i - 1]?.f;
                  const newMonth = !prev || prev.month !== f.month || prev.year !== f.year;
                  const inMonth = newMonth ? list.filter((r) => r.f.year === f.year && r.f.month === f.month).length : 0;
                  return (<Fragment key={f.id}>
                  {newMonth && (
                    <tr className="month-sep"><td colSpan={10}><span>{f.month ? MONTHS[f.month - 1] : 'без месяца'}{year === 'all' ? ` ${f.year}` : ''} <small>· {inMonth} {plural(inMonth, 'фанфик', 'фанфика', 'фанфиков')}</small></span></td></tr>
                  )}
                  <tr onClick={() => setEdit(f)}>
                    <td className="muted">{year === 'all' ? `${f.year}·${n}` : n}</td>
                    <td>{f.month ? MONTHS_SHORT[f.month - 1] : ''}</td>
                    <td className="title">{f.title}</td>
                    <td className="dl-cell" onClick={(e) => { e.stopPropagation(); toggleDl(f); }} title={f.downloaded ? 'Скачан — нажмите, чтобы снять' : 'Не скачан — нажмите, чтобы отметить'}><span className={'dl' + (f.downloaded ? ' on' : '')}>{f.downloaded ? '✓' : ''}</span></td>
                    <td>{f.fandom}</td><td className="num"><Rating v={f.rating} /></td>
                    <td>{f.language}</td><td>{f.site}</td><td>{f.genre}</td><td className="notes">{f.notes}</td>
                  </tr>
                  </Fragment>);
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {edit && <FanficForm ff={edit === 'new' ? null : edit} defYear={year === 'all' ? years[0] : year} onClose={() => setEdit(null)} />}
    </>
  );
}

function FanficForm({ ff, defYear, onClose }: { ff: Fanfic | null; defYear: number; onClose: () => void }) {
  const { db, save, remove } = useData();
  const [f, setF] = useState<NewRow<'fanfics'>>(() => {
    if (ff) { const { id: _id, ...rest } = ff; return rest; }
    const now = new Date();
    return { year: defYear, month: defYear === now.getFullYear() ? now.getMonth() + 1 : 1, title: '', fandom: db.fanfics.at(-1)?.fandom ?? '', rating: null, language: 'rus', downloaded: false, site: 'ficbook', genre: '', notes: '', first_time: null };
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const opts = (k: 'fandom' | 'site' | 'language') => [...new Set(db.fanfics.map((x) => x[k]).filter(Boolean))].sort();
  const submit = async (e: React.FormEvent) => { e.preventDefault(); await save('fanfics', f, ff?.id); onClose(); };
  return (
    <Modal title={ff ? 'Изменить фанфик' : 'Новый фанфик'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Название" wide><input value={f.title} onChange={(e) => set('title', e.target.value)} required autoFocus /></Field>
        <Field label="Год"><input type="number" value={f.year} onChange={(e) => set('year', Number(e.target.value))} /></Field>
        <Field label="Месяц">
          <select value={f.month ?? ''} onChange={(e) => set('month', e.target.value ? Number(e.target.value) : null)}>
            <option value="">—</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Фандом"><input list="dl-fandom" value={f.fandom} onChange={(e) => set('fandom', e.target.value)} /></Field>
        <Field label="Оценка (0–10)"><input type="number" min={0} max={10} step={0.5} value={f.rating ?? ''} onChange={(e) => set('rating', e.target.value === '' ? null : Number(e.target.value))} /></Field>
        <Field label="Язык"><input list="dl-fflang" value={f.language} onChange={(e) => set('language', e.target.value)} /></Field>
        <Field label="Сайт"><input list="dl-site" value={f.site} onChange={(e) => set('site', e.target.value)} /></Field>
        <Field label="Жанр (метки через пробел или запятую)" wide><input value={f.genre} onChange={(e) => set('genre', e.target.value)} placeholder="everyday omegaverse" /></Field>
        <Field label="Пометки" wide><textarea rows={4} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <div className="checks wide"><label><input type="checkbox" checked={!!f.downloaded} onChange={(e) => set('downloaded', e.target.checked)} /> 📥 скачан</label></div>
        <Datalist id="dl-fandom" values={opts('fandom')} /><Datalist id="dl-site" values={opts('site')} /><Datalist id="dl-fflang" values={opts('language')} />
        <div className="actions wide">
          {ff && <button type="button" className="danger" onClick={async () => { if (confirm(`Удалить «${ff.title}»?`)) { await remove('fanfics', ff.id); onClose(); } }}>Удалить</button>}
          <span className="spacer" />
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary">Сохранить</button>
        </div>
      </form>
    </Modal>
  );
}
