-- =========================================================
-- Pamus Grit 주말특강 V3 업데이트
-- Supabase > SQL Editor > New query 에 붙여넣고 Run
-- =========================================================

-- 1) 실제 특강 날짜 컬럼 추가
alter table public.special_classes
add column if not exists class_date date;

-- 기존 day 컬럼은 이전 데이터 호환용으로 그대로 둡니다.
-- 새 사이트에서는 class_date가 실제 날짜 기준이 됩니다.

-- 2) 학생 관리 화면에서 학생 추가/삭제 가능하도록 RLS 정책 추가
alter table public.students enable row level security;

drop policy if exists "students_insert" on public.students;
create policy "students_insert"
on public.students
for insert
to anon
with check (true);

drop policy if exists "students_delete" on public.students;
create policy "students_delete"
on public.students
for delete
to anon
using (true);

-- 3) 기존 읽기 정책이 없다면 생성
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

-- 4) 같은 학생이 같은 특강을 중복 신청하지 못하게 유지
create unique index if not exists registrations_student_class_unique
on public.registrations (student_id, special_class_id);
