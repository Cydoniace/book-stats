export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август',
  'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const LANGUAGES: Record<string, string> = { rus: 'русский', eng: 'английский', bel: 'белорусский', ukr: 'украинский' };
export const FORMATS: Record<string, string> = { paper: 'бумага', ebook: 'эл. книга', phone: 'телефон', audio: 'аудио' };

export const label = (map: Record<string, string>, v: string) => map[v] ?? (v || '—');

const nf = new Intl.NumberFormat('ru-RU');
export const fmt = (n: number) => nf.format(n);
export const fmt2 = (n: number | null) => (n == null || Number.isNaN(n) ? '—' : n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }));

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'];

/** Эпоха как в листе stats: век для старых книг (10 = «до X века»), 1700/1750, дальше десятилетия. */
export function periodFromYear(pubYear: string): number | null {
  const m = /\d{3,4}/.exec(pubYear ?? '');
  if (!m) return null;
  const y = Number(m[0]);
  if (y < 1000) return 10;
  if (y < 1700) return Math.floor(y / 100) + 1;
  if (y < 1800) return y < 1750 ? 1700 : 1750;
  return Math.floor(y / 10) * 10;
}

export function periodLabel(p: number): string {
  if (p === 10) return 'до X в.';
  if (p < 100) return `${ROMAN[p]} в.`;
  if (p === 1700) return '1700–1749';
  if (p === 1750) return '1750–1799';
  return `${p}-е`;
}

export const ddmm = (iso: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : '');

/** 1 книга, 2 книги, 5 книг */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
