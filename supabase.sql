-- StreamBox schema. Run once in Supabase Dashboard -> SQL Editor.

create table if not exists movies (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  year        int,
  genre       text,
  mins        int,
  hue         int default 200,   -- 0-360, used for the generated poster gradient
  about       text,
  video_url   text not null,
  poster_url  text,
  created_at  timestamptz default now()
);

create table if not exists my_list (
  user_id   uuid default auth.uid() references auth.users(id) on delete cascade,
  movie_id  uuid references movies(id) on delete cascade,
  primary key (user_id, movie_id)
);

create table if not exists progress (
  user_id    uuid default auth.uid() references auth.users(id) on delete cascade,
  movie_id   uuid references movies(id) on delete cascade,
  t          real,   -- saved position, seconds
  d          real,   -- total duration, seconds
  updated_at timestamptz default now(),
  primary key (user_id, movie_id)
);

-- One profile row per user, created automatically when someone signs up
create table if not exists profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (user_id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security
alter table movies   enable row level security;
alter table my_list  enable row level security;
alter table progress enable row level security;
alter table profiles enable row level security;

drop policy if exists "movies readable" on movies;
create policy "movies readable" on movies
  for select to authenticated using (true);

drop policy if exists "own list" on my_list;
create policy "own list" on my_list
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own progress" on progress;
create policy "own progress" on progress
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Profiles for any users that signed up before this script was run
insert into profiles (user_id, email, display_name)
  select id, email, split_part(email, '@', 1) from auth.users
  on conflict do nothing;

-- Demo movies: Blender Foundation open-licence films (CC-BY)
insert into movies (title, year, genre, mins, hue, about, video_url, poster_url) values
('Big Buck Bunny', 2008, 'Comedy', 10, 130,
 'A gentle giant rabbit wakes up to a sunny meadow, until three mischievous rodents decide to ruin his day. He plans a very creative payback.',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'https://commons.wikimedia.org/wiki/Special:FilePath/Big_buck_bunny_poster_big.jpg?width=600'),
('Sintel', 2010, 'Fantasy', 15, 20,
 'A lone young woman searches distant mountains and harsh lands for the small dragon she once befriended, and finds more than she bargained for.',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
 'https://commons.wikimedia.org/wiki/Special:FilePath/Sintel_poster.jpg?width=600'),
('Tears of Steel', 2012, 'Sci-Fi', 12, 210,
 'In a future Amsterdam, a group of warriors and scientists try to save the world by repairing a mistake from the past with robots and a risky experiment.',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
 'https://commons.wikimedia.org/wiki/Special:FilePath/Tos-poster.png?width=600'),
('Elephants Dream', 2006, 'Sci-Fi', 11, 280,
 'Two strange men wander through a vast mechanical world where one trusts what he sees and the other knows better. A surreal journey about perception.',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
 'https://commons.wikimedia.org/wiki/Special:FilePath/Elephants_Dream_s5_both.jpg?width=600');
