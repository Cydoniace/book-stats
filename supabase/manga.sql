-- Манга: отдельная таблица + перенос манги из журнала книг.
-- Выполнить один раз: Supabase -> SQL Editor -> New query -> вставить всё -> Run.

-- 1) таблица
create table if not exists public.manga (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year        int  not null,
  month       int  check (month between 1 and 12),
  title       text not null,
  author      text,
  kind        text,                       -- манга / манхва / манхуа
  chapters    int,                        -- сколько глав
  rating      numeric(3,1),
  language    text,
  site        text,
  genre       text,
  notes       text,
  downloaded  boolean not null default false,
  first_time  boolean,
  created_at  timestamptz not null default now()
);

create index if not exists manga_user_year on public.manga (user_id, year);
alter table public.manga enable row level security;
drop policy if exists "own rows" on public.manga;
create policy "own rows" on public.manga for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.manga to authenticated;

-- 2) перенести мангу из книг (жанр «манга», включая опечатку «мангга»).
--    Тип — по стране: Япония → манга, Корея → манхва, Китай → манхуа.
--    Страницы и формат из журнала книг сохраняются в пометках.
insert into public.manga (user_id, year, month, title, author, kind, chapters, rating, language, site, genre, notes, downloaded, first_time)
select user_id, year, month, title, author,
       case when country ilike '%корея%' then 'манхва'
            when country ilike '%китай%' then 'манхуа'
            else 'манга' end,
       null, rating, language, '', '',
       concat_ws(', ', 'перенесено из книг',
                 case when pages is not null then pages || ' стр.' end,
                 case format when 'paper' then 'бумага' when 'phone' then 'телефон' when 'ebook' then 'эл. книга' end),
       false, first_time
from public.books
where lower(trim(genre)) in ('манга', 'мангга');

delete from public.books where lower(trim(genre)) in ('манга', 'мангга');

-- 3) обновить кэш API
notify pgrst, 'reload schema';

-- проверка: должно получиться 2024: 3, 2025: 2, 2026: 1
select year, kind, title from public.manga order by year, month;
