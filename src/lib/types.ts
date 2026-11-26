export type Pick = 'fav' | 'worst' | null;

export interface Book {
  id: number;
  year: number;
  month: number | null;
  start_date: string | null;
  end_date: string | null;
  title: string;
  author: string;
  rating: number | null;
  new_author: boolean | null;
  pub_year: string;
  period: number | null;
  genre: string;
  source: string;
  language: string;
  country: string;
  pages: number | null;
  format: string;
  first_time: boolean | null;
  pick: Pick;
}

export interface Fanfic {
  id: number;
  year: number;
  month: number | null;
  title: string;
  fandom: string;
  rating: number | null;
  language: string;
  site: string;
  genre: string;
  notes: string;
  first_time: boolean | null;
  /** скачан ли фанфик (в старой таблице такие названия были курсивом) */
  downloaded: boolean;
}

export type MangaKind = 'манга' | 'манхва' | 'манхуа';

export interface Manga {
  id: number;
  year: number;
  month: number | null;
  title: string;
  author: string;
  kind: MangaKind | string;
  chapters: number | null;
  rating: number | null;
  language: string;
  site: string;
  genre: string;
  notes: string;
  downloaded: boolean;
  first_time: boolean | null;
}

export interface ToRead {
  id: number;
  title: string;
  author: string;
  comment: string;
  downloaded: boolean;
  note: string;
}

export interface Db {
  books: Book[];
  fanfics: Fanfic[];
  manga: Manga[];
  toread: ToRead[];
}

export type Table = keyof Db;
export type Row<T extends Table> = Db[T][number];
export type NewRow<T extends Table> = Omit<Row<T>, 'id'>;
