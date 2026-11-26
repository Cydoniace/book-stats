-- Выполнить один раз: Supabase -> SQL Editor -> New query -> вставить всё -> Run.
-- Каждая запись принадлежит пользователю (user_id); правила RLS не дают читать и менять чужие записи.

create table if not exists public.books (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year        int  not null,              -- год, в котором книга прочитана
  month       int  check (month between 1 and 12),
  start_date  date,
  end_date    date,
  title       text not null,
  author      text,
  rating      numeric(3,1),
  new_author  boolean,                    -- «новый?» — первая книга этого автора
  pub_year    text,                       -- год издания (бывает «1952,1961»)
  period      int,                        -- эпоха: век (10..17), 1700, 1750, десятилетие 1800+
  genre       text,
  source      text,                       -- «откуда?»
  language    text,
  country     text,
  pages       int,
  format      text,                       -- paper / ebook / phone
  first_time  boolean,                    -- «1 раз?» — читаю впервые
  pick        text check (pick in ('fav', 'worst')),  -- любимая / нелюбимая книга месяца
  created_at  timestamptz not null default now()
);

create table if not exists public.fanfics (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year        int  not null,
  month       int  check (month between 1 and 12),
  title       text not null,
  fandom      text,
  rating      numeric(3,1),
  language    text,
  site        text,
  genre       text,
  notes       text,
  first_time  boolean,
  downloaded  boolean not null default false,  -- скачан ли фанфик
  created_at  timestamptz not null default now()
);

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

create table if not exists public.toread (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  author      text,
  comment     text,
  downloaded  boolean not null default false,
  note        text,
  created_at  timestamptz not null default now()
);

-- для баз, созданных до появления поля «скачан»
alter table public.fanfics add column if not exists downloaded boolean not null default false;

create index if not exists books_user_year on public.books (user_id, year);
create index if not exists fanfics_user_year on public.fanfics (user_id, year);
create index if not exists manga_user_year on public.manga (user_id, year);

alter table public.books   enable row level security;
alter table public.fanfics enable row level security;
alter table public.manga   enable row level security;
alter table public.toread  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['books', 'fanfics', 'manga', 'toread'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Права для вошедших пользователей (в новых проектах Supabase они не выдаются автоматически).
-- Какие именно строки видит пользователь, всё равно решают правила RLS выше.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.books, public.fanfics, public.manga, public.toread to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Сообщить API о новых таблицах сразу (иначе ошибка «schema cache» может держаться какое-то время)
notify pgrst, 'reload schema';
