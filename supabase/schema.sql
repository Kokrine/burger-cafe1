-- „ჩემი ბურგერების კაფე" — Supabase-ის სქემა.
-- გაშვება: Supabase → SQL Editor → ეს ფაილი. შემდეგ Authentication → Providers-ში
-- ჩართე Email (მასწავლებლებისთვის) და Anonymous sign-ins (მოსწავლეებისთვის).
--
-- მოდელი:
--  * მასწავლებელი = Supabase-ის ჩვეულებრივი მომხმარებელი (ელფოსტა + პაროლი).
--  * მოსწავლეს ელფოსტა არ აქვს: აპი აკეთებს signInAnonymously(), შემდეგ
--    student_login(კოდი, მოსწავლე, PIN) ფუნქცია ამოწმებს PIN-ს და ამ ანონიმურ
--    სესიას აკავშირებს მოსწავლესთან (student_sessions).
--  * პირადი მონაცემები: მხოლოდ სახელი/მეტსახელი და კლასი. PIN ინახება bcrypt-ით.
--  * RLS: მოსწავლე ხედავს მხოლოდ საკუთარ პროგრესს, მასწავლებელი — მხოლოდ თავისი კლასისას.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- ცხრილები

create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  grade       smallint not null check (grade between 1 and 4),
  code        text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at  timestamptz not null default now()
);

create table public.students (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid not null references public.classes on delete cascade,
  nickname         text not null check (char_length(nickname) between 1 and 30),
  pin_hash         text not null,
  failed_attempts  int not null default 0,
  locked_until     timestamptz,
  created_at       timestamptz not null default now()
);
create index on public.students (class_id);

-- ანონიმური სესია → მოსწავლე
create table public.student_sessions (
  auth_uid    uuid primary key references auth.users on delete cascade,
  student_id  uuid not null references public.students on delete cascade,
  created_at  timestamptz not null default now()
);

-- მოსწავლის პროგრესი (თამაშის მთელი მდგომარეობა jsonb-ში + სვეტები მასწავლებლის პანელისთვის)
create table public.progress (
  student_id   uuid primary key references public.students on delete cascade,
  data         jsonb not null default '{}'::jsonb,
  points       int not null default 0,
  stars        int not null default 0,
  money        int not null default 0,
  day          int not null default 1,
  cafe_level   int not null default 1,
  badges       int not null default 0,
  accuracy     jsonb not null default '{}'::jsonb,
  last_active  timestamptz not null default now()
);

-- ---------------------------------------------------------------- დამხმარეები

create or replace function public.is_teacher() returns boolean
language sql stable as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

create or replace function public.current_student_id() returns uuid
language sql stable security definer set search_path = public as $$
  select student_id from student_sessions where auth_uid = auth.uid()
$$;

create or replace function public.owns_class(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = p_class and teacher_id = auth.uid())
$$;

create or replace function public.random_pin() returns text
language sql volatile as $$ select lpad((floor(random() * 10000))::int::text, 4, '0') $$;

-- ---------------------------------------------------------------- მასწავლებლის ფუნქციები

create or replace function public.create_class(p_name text, p_grade int) returns public.classes
language plpgsql security definer set search_path = public as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_row classes;
begin
  if not is_teacher() then raise exception 'not a teacher'; end if;
  loop
    v_code := '';
    for i in 1..6 loop v_code := v_code || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
    exit when not exists (select 1 from classes where code = v_code);
  end loop;
  insert into classes (teacher_id, name, grade, code) values (auth.uid(), trim(p_name), p_grade, v_code) returning * into v_row;
  return v_row;
end $$;

-- აბრუნებს ახალ PIN-ს (მასწავლებელს ერთხელ ეჩვენება)
create or replace function public.add_student(p_class uuid, p_nickname text) returns table (student_id uuid, pin text)
language plpgsql security definer set search_path = public, extensions as $$
declare v_pin text := random_pin(); v_id uuid;
begin
  if not owns_class(p_class) then raise exception 'not your class'; end if;
  insert into students (class_id, nickname, pin_hash) values (p_class, trim(p_nickname), crypt(v_pin, gen_salt('bf')))
    returning id into v_id;
  insert into progress (student_id) values (v_id);
  return query select v_id, v_pin;
end $$;

create or replace function public.reset_pin(p_student uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_pin text := random_pin(); v_class uuid;
begin
  select class_id into v_class from students where id = p_student;
  if v_class is null or not owns_class(v_class) then raise exception 'not your student'; end if;
  update students set pin_hash = crypt(v_pin, gen_salt('bf')), failed_attempts = 0, locked_until = null where id = p_student;
  return v_pin;
end $$;

-- ---------------------------------------------------------------- მოსწავლის შესვლა

-- კლასის კოდით სახელების სია (მხოლოდ id + მეტსახელი)
create or replace function public.class_roster(p_code text)
returns table (class_id uuid, class_name text, grade smallint, student_id uuid, nickname text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.grade, s.id, s.nickname
  from classes c left join students s on s.class_id = c.id
  where c.code = upper(trim(p_code))
  order by s.nickname
$$;

-- PIN-ის შემოწმება; 5 შეცდომის შემდეგ 1 წუთით ბლოკი. მოითხოვს ანონიმურ სესიას.
create or replace function public.student_login(p_code text, p_student uuid, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare s students; c classes;
begin
  if auth.uid() is null then raise exception 'sign in anonymously first'; end if;
  select * into c from classes where code = upper(trim(p_code));
  select * into s from students where id = p_student and class_id = c.id;
  if s.id is null then return json_build_object('ok', false, 'error', 'not-found'); end if;
  if s.locked_until is not null and s.locked_until > now() then
    return json_build_object('ok', false, 'error', 'locked', 'until', s.locked_until);
  end if;
  if s.pin_hash <> crypt(p_pin, s.pin_hash) then
    update students set
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '1 minute' else null end,
      failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end
      where id = s.id;
    return json_build_object('ok', false, 'error', 'bad-pin');
  end if;
  update students set failed_attempts = 0, locked_until = null where id = s.id;
  insert into student_sessions (auth_uid, student_id) values (auth.uid(), s.id)
    on conflict (auth_uid) do update set student_id = excluded.student_id, created_at = now();
  insert into progress (student_id) values (s.id) on conflict do nothing;
  return json_build_object('ok', true, 'student_id', s.id, 'nickname', s.nickname,
                           'class_id', c.id, 'class_name', c.name, 'grade', c.grade);
end $$;

-- ---------------------------------------------------------------- Row Level Security

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.student_sessions enable row level security;
alter table public.progress enable row level security;

-- კლასები: მხოლოდ მფლობელი მასწავლებელი (შექმნა — create_class ფუნქციით)
create policy classes_owner_select on public.classes for select using (teacher_id = auth.uid());
create policy classes_owner_update on public.classes for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy classes_owner_delete on public.classes for delete using (teacher_id = auth.uid());

-- მოსწავლეები: მასწავლებელი ხედავს/შლის თავისი კლასისას; მოსწავლე — მხოლოდ თავს.
-- დამატება და PIN — მხოლოდ ფუნქციებით. pin_hash სვეტი არავის ეჩვენება.
create policy students_teacher_select on public.students for select using (owns_class(class_id));
create policy students_teacher_delete on public.students for delete using (owns_class(class_id));
create policy students_self_select on public.students for select using (id = current_student_id());
revoke select on public.students from anon, authenticated;
grant select (id, class_id, nickname, created_at) on public.students to authenticated;
grant delete on public.students to authenticated;

-- სესიები: პირდაპირი წვდომა არავისთვის (მხოლოდ student_login)
revoke all on public.student_sessions from anon, authenticated;

-- პროგრესი: მოსწავლე — მხოლოდ საკუთარი (კითხვა/ჩაწერა), მასწავლებელი — მხოლოდ კითხვა თავის კლასზე
create policy progress_self_select on public.progress for select using (student_id = current_student_id());
create policy progress_self_update on public.progress for update using (student_id = current_student_id()) with check (student_id = current_student_id());
create policy progress_self_insert on public.progress for insert with check (student_id = current_student_id());
create policy progress_teacher_select on public.progress for select
  using (exists (select 1 from public.students s where s.id = progress.student_id and owns_class(s.class_id)));

-- ---------------------------------------------------------------- უფლებები ფუნქციებზე

revoke execute on all functions in schema public from anon, public;
grant execute on function public.class_roster(text) to anon, authenticated;
grant execute on function public.student_login(text, uuid, text) to authenticated;
grant execute on function public.create_class(text, int) to authenticated;
grant execute on function public.add_student(uuid, text) to authenticated;
grant execute on function public.reset_pin(uuid) to authenticated;
grant execute on function public.is_teacher() to authenticated;
grant execute on function public.current_student_id() to authenticated;
grant execute on function public.owns_class(uuid) to authenticated;

-- ---------------------------------------------------------------- ხმით კითხვა (Edge Function „tts")
-- წაკითხული ფრაზების ქეში: დახურული bucket — მხოლოდ ფუნქცია (service role) კითხულობს და წერს.
-- ფუნქცია: supabase/functions/tts (Dashboard-ში „Verify JWT" გამორთულია — თამაში publishable
-- გასაღებს აგზავნის, რომელიც JWT არ არის). საიდუმლოები: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION.
insert into storage.buckets (id, name, public) values ('tts', 'tts', false) on conflict (id) do nothing;
