-- Pamus Grit 주말특강 앱용 Supabase 설정
-- Supabase > SQL Editor 에서 전체 실행하세요.
-- 이미 테이블을 만든 경우에도 정책/인덱스 부분은 적용할 수 있습니다.

-- 같은 학생이 같은 특강을 중복 신청하지 못하게 합니다.
create unique index if not exists registrations_student_class_unique
on public.registrations (student_id, special_class_id);

-- 현재 웹앱은 Supabase publishable key(anon)로 동작합니다.
-- RLS가 켜져 있다면 아래 정책이 필요합니다.
alter table public.students enable row level security;
alter table public.special_classes enable row level security;
alter table public.registrations enable row level security;

drop policy if exists "students_read" on public.students;
create policy "students_read"
on public.students
for select
to anon
using (true);

drop policy if exists "classes_read" on public.special_classes;
create policy "classes_read"
on public.special_classes
for select
to anon
using (true);

drop policy if exists "classes_insert" on public.special_classes;
create policy "classes_insert"
on public.special_classes
for insert
to anon
with check (true);

drop policy if exists "classes_delete" on public.special_classes;
create policy "classes_delete"
on public.special_classes
for delete
to anon
using (true);

drop policy if exists "registrations_read" on public.registrations;
create policy "registrations_read"
on public.registrations
for select
to anon
using (true);

drop policy if exists "registrations_insert" on public.registrations;
create policy "registrations_insert"
on public.registrations
for insert
to anon
with check (true);

drop policy if exists "registrations_delete" on public.registrations;
create policy "registrations_delete"
on public.registrations
for delete
to anon
using (true);
