import { useData } from '../App';
import { BarChart, LineChart } from '../components/Charts';
import { Card } from '../components/ui';
import { fmt, fmt2, MONTHS_SHORT } from '../lib/format';
import { bookSummary, byMonth, fanficSummary } from '../lib/stats';

export default function ComparePage() {
  const { db } = useData();
  const years = [...new Set([...db.books, ...db.fanfics].map((r) => r.year))].sort();
  if (!years.length) return <p className="muted">Данных пока нет.</p>;
  const rows = years.map((y) => {
    const b = db.books.filter((x) => x.year === y);
    return { y, b, s: bookSummary(b), f: fanficSummary(db.fanfics.filter((x) => x.year === y)), eng: b.filter((x) => x.language === 'eng').length, paper: b.filter((x) => x.format === 'paper').length };
  });
  const all = bookSummary(db.books);
  const recent = rows.slice(-4); // на одном графике не больше 4 лет — иначе цвета не различить
  const cumulative = (xs: number[]) => xs.reduce<number[]>((acc, v) => [...acc, (acc.at(-1) ?? 0) + v], []);
  const thisYear = new Date().getFullYear();
  const curMonth = new Date().getMonth();

  return (
    <>
      <div className="table-wrap">
        <table className="mini compare">
          <thead>
            <tr><th></th>{rows.map((r) => <th key={r.y} className="num">{r.y}</th>)}<th className="num">всего</th></tr>
          </thead>
          <tbody>
            <tr><td>Книг</td>{rows.map((r) => <td key={r.y} className="num"><b>{r.s.count}</b></td>)}<td className="num"><b>{all.count}</b></td></tr>
            <tr><td>Страниц</td>{rows.map((r) => <td key={r.y} className="num">{fmt(r.s.pages)}</td>)}<td className="num">{fmt(all.pages)}</td></tr>
            <tr><td>Средняя оценка</td>{rows.map((r) => <td key={r.y} className="num">{fmt2(r.s.avg)}</td>)}<td className="num">{fmt2(all.avg)}</td></tr>
            <tr><td>Медиана оценок</td>{rows.map((r) => <td key={r.y} className="num">{fmt2(r.s.median)}</td>)}<td className="num">{fmt2(all.median)}</td></tr>
            <tr><td>Перечитала</td>{rows.map((r) => <td key={r.y} className="num">{r.s.reread}</td>)}<td className="num">{all.reread}</td></tr>
            <tr><td>Новые авторы</td>{rows.map((r) => <td key={r.y} className="num">{r.s.newAuthor}</td>)}<td className="num">{all.newAuthor}</td></tr>
            <tr><td>На английском</td>{rows.map((r) => <td key={r.y} className="num">{r.eng}</td>)}<td className="num">{rows.reduce((a, r) => a + r.eng, 0)}</td></tr>
            <tr><td>На бумаге</td>{rows.map((r) => <td key={r.y} className="num">{r.paper}</td>)}<td className="num">{rows.reduce((a, r) => a + r.paper, 0)}</td></tr>
            <tr><td>Фанфиков</td>{rows.map((r) => <td key={r.y} className="num">{r.f.count}</td>)}<td className="num">{rows.reduce((a, r) => a + r.f.count, 0)}</td></tr>
            <tr><td>Ср. оценка фанфиков</td>{rows.map((r) => <td key={r.y} className="num">{fmt2(r.f.avg)}</td>)}<td className="num">{fmt2(fanficSummary(db.fanfics).avg)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid">
        <Card title="Книг за год"><BarChart labels={rows.map((r) => String(r.y))} series={[{ label: 'книг', data: rows.map((r) => r.s.count) }]} /></Card>
        <Card title="Страниц за год"><BarChart labels={rows.map((r) => String(r.y))} series={[{ label: 'страниц', data: rows.map((r) => r.s.pages) }]} format={fmt} /></Card>
        <Card title="Книг с начала года (нарастающим итогом)" wide>
          <LineChart labels={MONTHS_SHORT} series={recent.map((r) => {
            const c = cumulative(byMonth(r.b));
            return { label: String(r.y), data: r.y === thisYear ? c.map((v, i) => (i <= curMonth ? v : null)) : c };
          })} height={280} />
        </Card>
        <Card title="Книг по месяцам" wide>
          <BarChart labels={MONTHS_SHORT} series={recent.map((r) => ({ label: String(r.y), data: byMonth(r.b) }))} />
        </Card>
      </div>
    </>
  );
}
