import type { Book, Fanfic } from './types';

export type Count = [string, number];

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const ratings = (xs: { rating: number | null }[]) => xs.map((x) => x.rating).filter((r): r is number => r != null);

/** Подсчёт по ключу, по убыванию. */
export function countBy<T>(xs: T[], key: (x: T) => string | string[] | null | undefined): Count[] {
  const m = new Map<string, number>();
  for (const x of xs) {
    const k = key(x);
    for (const v of Array.isArray(k) ? k : [k]) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1]);
}

/** Средняя оценка по ключу (с количеством). */
export function avgBy<T extends { rating: number | null }>(xs: T[], key: (x: T) => string) {
  const m = new Map<string, number[]>();
  for (const x of xs) {
    const k = key(x);
    if (k && x.rating != null) m.set(k, [...(m.get(k) ?? []), x.rating]);
  }
  return [...m].map(([k, v]) => ({ key: k, avg: avg(v)!, n: v.length })).sort((a, b) => b.avg - a.avg);
}

export const ratingHist = (xs: { rating: number | null }[]) => {
  const h = Array(11).fill(0) as number[];
  for (const r of ratings(xs)) h[Math.max(0, Math.min(10, Math.round(r)))]++;
  return h;
};

export const byMonth = <T extends { month: number | null }>(xs: T[], val: (x: T) => number = () => 1) => {
  const m = Array(12).fill(0) as number[];
  for (const x of xs) if (x.month) m[x.month - 1] += val(x);
  return m;
};

export function bookSummary(books: Book[]) {
  const r = ratings(books);
  return {
    count: books.length,
    pages: books.reduce((s, b) => s + (b.pages ?? 0), 0),
    avg: avg(r),
    median: median(r),
    firstTime: books.filter((b) => b.first_time !== false).length,
    reread: books.filter((b) => b.first_time === false).length,
    newAuthor: books.filter((b) => b.new_author === true).length,
    knownAuthor: books.filter((b) => b.new_author === false).length,
  };
}

export function fanficSummary(ff: Fanfic[]) {
  const r = ratings(ff);
  return { count: ff.length, avg: avg(r), median: median(r) };
}

// ---------- жанры фанфиков ----------
/** Группы жанров как в листе stats. Слова ищутся как часть метки, без учёта регистра. */
export const FF_GENRES: [string, string[]][] = [
  ['омегаверс', ['omeg', 'oneg', 'омега', 'омегаверс']],
  ['эвридэй', ['everyday', 'эвридэй', 'эвридей', 'повседнев']],
  ['werewolf', ['werewolf', 'оборот', 'вервольф']],
  ['хистори', ['histor', 'хистори', 'истори']],
  ['мафия', ['mafia', 'мафи']],
  ['детектив', ['detective', 'детектив', 'трукрайм']],
  ['канон', ['canon', 'канон']],
  ['фантастика', ['fantas', 'phantas', 'фантаст', 'фэнтези', 'sci-fi']],
];
export function ffGenreGroups(genre: string): string[] {
  const g = genre.toLowerCase();
  const hits = FF_GENRES.filter(([, ws]) => ws.some((w) => g.includes(w))).map(([k]) => k);
  return hits.length ? hits : ['другое'];
}
