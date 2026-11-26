import { useMemo } from 'react';
import { useData, useYears } from '../App';
import { BarChart, percent as percentText } from '../components/Charts';
import { Card, CountTable, Pct, Tile, YearSelect } from '../components/ui';
import { fmt, fmt2, FORMATS, label, LANGUAGES, MONTHS, MONTHS_SHORT, periodLabel } from '../lib/format';
import { avgBy, bookSummary, byMonth, countBy, ratingHist } from '../lib/stats';

export default function StatsPage() {
  const { db } = useData();
  const years = useYears(db.books);
  const { year, setYear } = useData();
  const books = useMemo(() => db.books.filter((b) => year === 'all' || b.year === year), [db.books, year]);
  const s = bookSummary(books);

  const perMonth = byMonth(books);
  const pagesMonth = byMonth(books, (b) => b.pages ?? 0);
  const hist = ratingHist(books);
  const periods = countBy(books, (b) => (b.period != null ? String(b.period) : null)).sort((a, b) => Number(a[0]) - Number(b[0]));
  const countries = countBy(books, (b) => b.country);
  const genres = countBy(books, (b) => b.genre);
  const genreAvg = new Map(avgBy(books, (b) => b.genre).map((g) => [g.key, g.avg]));
  const sources = avgBy(books, (b) => b.source).sort((a, b) => b.n - a.n);
  const authors = countBy(books, (b) => b.author).filter(([a, n]) => n > 1 && a !== '-');
  const withPages = books.filter((b) => b.pages);
  const longest = withPages.reduce<(typeof books)[number] | null>((m, b) => (!m || b.pages! > m.pages! ? b : m), null);
  const shortest = withPages.reduce<(typeof books)[number] | null>((m, b) => (!m || b.pages! < m.pages! ? b : m), null);
  const noPeriod = books.filter((b) => b.period == null).length;

  if (!books.length) return (<><div className="toolbar"><YearSelect years={years} value={year} onChange={setYear} all /></div><p className="muted empty-note">За этот год книг пока нет — самое время начать! 📖✨</p></>);

  return (
    <>
      <div className="toolbar"><YearSelect years={years} value={year} onChange={setYear} all /></div>
      <div className="tiles">
        <Tile icon="📚" label="Книг" value={fmt(s.count)} hint={<>впервые {s.firstTime}<Pct n={s.firstTime} of={s.count} /><br />перечитала {s.reread}<Pct n={s.reread} of={s.count} /></>} />
        <Tile icon="📄" label="Страниц" value={fmt(s.pages)} hint={s.count ? `≈ ${fmt(Math.round(s.pages / s.count))} на книгу` : ''} />
        <Tile icon="⭐" label="Средняя оценка" value={fmt2(s.avg)} hint={`медиана ${fmt2(s.median)}`} />
        <Tile icon="✨" label="Новые авторы" value={<>{fmt(s.newAuthor)}<span className="tile-pct">{percentText(s.newAuthor, s.count)}</span></>} hint={<>уже читала {s.knownAuthor}<Pct n={s.knownAuthor} of={s.count} /></>} />
      </div>

      <div className="grid">
        <Card title="📚 Книг по месяцам">
          <BarChart labels={MONTHS_SHORT} series={[{ label: 'книг', data: perMonth }]} total={s.count} />
        </Card>
        <Card title="📄 Страниц по месяцам">
          <BarChart labels={MONTHS_SHORT} series={[{ label: 'страниц', data: pagesMonth }]} format={fmt} total={s.pages} />
        </Card>

        {year !== 'all' && (
          <Card title="💖 Книги месяца" wide>
            <div className="table-wrap">
              <table className="mini">
                <thead><tr><th>Месяц</th><th className="num">Книг</th><th className="num">Страниц</th><th className="num">Ср. оценка</th><th>💖 Любимая</th><th>🥀 Нелюбимая</th></tr></thead>
                <tbody>
                  {MONTHS.map((m, i) => {
                    const mb = books.filter((b) => b.month === i + 1);
                    if (!mb.length) return null;
                    return (
                      <tr key={m}>
                        <td>{m}</td><td className="num">{mb.length}<Pct n={mb.length} of={s.count} /></td><td className="num">{fmt(pagesMonth[i])}<Pct n={pagesMonth[i]} of={s.pages} /></td>
                        <td className="num">{fmt2(bookSummary(mb).avg)}</td>
                        <td>{mb.find((b) => b.pick === 'fav')?.title ?? <span className="muted">—</span>}</td>
                        <td>{mb.find((b) => b.pick === 'worst')?.title ?? <span className="muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card title="⭐ Оценки">
          <BarChart labels={hist.map((_, i) => String(i))} series={[{ label: 'книг', data: hist }]} total={s.count} />
        </Card>
        <Card title="🕰 Эпоха (год издания)">
          <BarChart labels={periods.map(([p]) => periodLabel(Number(p)))} series={[{ label: 'книг', data: periods.map(([, n]) => n) }]} total={s.count} />
          {noPeriod > 0 && <p className="muted small">Без года издания: {noPeriod}</p>}
        </Card>

        <Card title="💬 Язык">
          <BarChart horizontal labels={countBy(books, (b) => b.language).map(([k]) => label(LANGUAGES, k))} series={[{ label: 'книг', data: countBy(books, (b) => b.language).map(([, n]) => n) }]} total={s.count} />
        </Card>
        <Card title="📱 Формат">
          <BarChart horizontal labels={countBy(books, (b) => b.format).map(([k]) => label(FORMATS, k))} series={[{ label: 'книг', data: countBy(books, (b) => b.format).map(([, n]) => n) }]} total={s.count} />
        </Card>

        <Card title={`🌍 Страны (${countries.length})`}>
          <BarChart horizontal labels={countries.slice(0, 15).map(([k]) => k)} series={[{ label: 'книг', data: countries.slice(0, 15).map(([, n]) => n) }]} total={s.count} />
          {countries.length > 15 && <p className="muted small">Ещё: {countries.slice(15).map(([k, n]) => `${k} ${n} (${percentText(n, s.count)})`).join(', ')}</p>}
        </Card>
        <Card title={`🎀 Жанры (${genres.length})`}>
          <CountTable head={['Жанр', 'Книг · доля · ср. оценка']} rows={genres.map(([g, n]) => [g, <>{n}<Pct n={n} of={s.count} /> · <b>{fmt2(genreAvg.get(g) ?? null)}</b></>])} />
        </Card>

        <Card title="🔎 Откуда узнала: средняя оценка">
          <CountTable head={['Источник', 'Книг · доля · ср. оценка']} rows={sources.map((x) => [x.key, <>{x.n}<Pct n={x.n} of={s.count} /> · <b>{fmt2(x.avg)}</b></>])} />
        </Card>
        <Card title="🏆 Рекорды и авторы">
          <dl className="facts">
            {longest && <><dt>Самая длинная</dt><dd>{longest.title} — {fmt(longest.pages!)} стр.</dd></>}
            {shortest && <><dt>Самая короткая</dt><dd>{shortest.title} — {fmt(shortest.pages!)} стр.</dd></>}
          </dl>
          {authors.length > 0 && <CountTable head={['Читала больше одной книги', 'Книг']} rows={authors.slice(0, 15).map(([a, n]) => [a, <>{n}<Pct n={n} of={s.count} /></>])} />}
        </Card>
      </div>
    </>
  );
}
