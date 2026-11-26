import { useMemo, useState } from 'react';
import { useData, useYears } from '../App';
import { BarChart } from '../components/Charts';
import { Card, CountTable, Tile, YearSelect } from '../components/ui';
import { fmt, fmt2, FORMATS, label, LANGUAGES, MONTHS, MONTHS_SHORT, periodLabel } from '../lib/format';
import { avgBy, bookSummary, byMonth, countBy, ratingHist } from '../lib/stats';

export default function StatsPage() {
  const { db } = useData();
  const years = useYears(db.books);
  const [year, setYear] = useState<number | 'all'>(years[0]);
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

  if (!books.length) return (<><div className="toolbar"><YearSelect years={years} value={year} onChange={setYear} all /></div><p className="muted">За этот год книг пока нет.</p></>);

  return (
    <>
      <div className="toolbar"><YearSelect years={years} value={year} onChange={setYear} all /></div>
      <div className="tiles">
        <Tile label="Книг" value={fmt(s.count)} hint={`впервые ${s.firstTime} · перечитала ${s.reread}`} />
        <Tile label="Страниц" value={fmt(s.pages)} hint={s.count ? `≈ ${fmt(Math.round(s.pages / s.count))} на книгу` : ''} />
        <Tile label="Средняя оценка" value={fmt2(s.avg)} hint={`медиана ${fmt2(s.median)}`} />
        <Tile label="Новые авторы" value={fmt(s.newAuthor)} hint={`уже читала ${s.knownAuthor}`} />
      </div>

      <div className="grid">
        <Card title="Книг по месяцам">
          <BarChart labels={MONTHS_SHORT} series={[{ label: 'книг', data: perMonth }]} />
        </Card>
        <Card title="Страниц по месяцам">
          <BarChart labels={MONTHS_SHORT} series={[{ label: 'страниц', data: pagesMonth }]} format={fmt} />
        </Card>

        {year !== 'all' && (
          <Card title="Книги месяца" wide>
            <div className="table-wrap">
              <table className="mini">
                <thead><tr><th>Месяц</th><th className="num">Книг</th><th className="num">Страниц</th><th className="num">Ср. оценка</th><th>♥ Любимая</th><th>✗ Нелюбимая</th></tr></thead>
                <tbody>
                  {MONTHS.map((m, i) => {
                    const mb = books.filter((b) => b.month === i + 1);
                    if (!mb.length) return null;
                    return (
                      <tr key={m}>
                        <td>{m}</td><td className="num">{mb.length}</td><td className="num">{fmt(pagesMonth[i])}</td>
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

        <Card title="Оценки">
          <BarChart labels={hist.map((_, i) => String(i))} series={[{ label: 'книг', data: hist }]} />
        </Card>
        <Card title="Эпоха (год издания)">
          <BarChart labels={periods.map(([p]) => periodLabel(Number(p)))} series={[{ label: 'книг', data: periods.map(([, n]) => n) }]} />
          {noPeriod > 0 && <p className="muted small">Без года издания: {noPeriod}</p>}
        </Card>

        <Card title="Язык">
          <BarChart horizontal labels={countBy(books, (b) => b.language).map(([k]) => label(LANGUAGES, k))} series={[{ label: 'книг', data: countBy(books, (b) => b.language).map(([, n]) => n) }]} />
        </Card>
        <Card title="Формат">
          <BarChart horizontal labels={countBy(books, (b) => b.format).map(([k]) => label(FORMATS, k))} series={[{ label: 'книг', data: countBy(books, (b) => b.format).map(([, n]) => n) }]} />
        </Card>

        <Card title={`Страны (${countries.length})`}>
          <BarChart horizontal labels={countries.slice(0, 15).map(([k]) => k)} series={[{ label: 'книг', data: countries.slice(0, 15).map(([, n]) => n) }]} />
          {countries.length > 15 && <p className="muted small">Ещё: {countries.slice(15).map(([k, n]) => `${k} ${n}`).join(', ')}</p>}
        </Card>
        <Card title={`Жанры (${genres.length})`}>
          <CountTable head={['Жанр', 'Книг · ср. оценка']} rows={genres.map(([g, n]) => [g, <>{n} · <b>{fmt2(genreAvg.get(g) ?? null)}</b></>])} />
        </Card>

        <Card title="Откуда узнала: средняя оценка">
          <CountTable head={['Источник', 'Книг · ср. оценка']} rows={sources.map((x) => [x.key, <>{x.n} · <b>{fmt2(x.avg)}</b></>])} />
        </Card>
        <Card title="Рекорды и авторы">
          <dl className="facts">
            {longest && <><dt>Самая длинная</dt><dd>{longest.title} — {fmt(longest.pages!)} стр.</dd></>}
            {shortest && <><dt>Самая короткая</dt><dd>{shortest.title} — {fmt(shortest.pages!)} стр.</dd></>}
          </dl>
          {authors.length > 0 && <CountTable head={['Читала больше одной книги', 'Книг']} rows={authors.slice(0, 15).map(([a, n]) => [a, n])} />}
        </Card>
      </div>
    </>
  );
}
