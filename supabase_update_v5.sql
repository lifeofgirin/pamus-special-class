-- =========================================================
-- Pamus Grit 주말특강 V5 업데이트
-- Supabase > SQL Editor > New query 에 붙여넣고 Run
-- =========================================================

-- 관리자 수동 마감 상태
alter table public.special_classes
add column if not exists is_closed boolean not null default false;

-- 관리자에서 특강 수정 가능
drop policy if exists "classes_update" on public.special_classes;
create policy "classes_update"
on public.special_classes
for update
to anon
using (true)
with check (true);

-- 학생 삭제 전에 신청내역을 지우는 현재 웹앱 동작을 허용
drop policy if exists "registrations_delete" on public.registrations;
create policy "registrations_delete"
on public.registrations
for delete
to anon
using (true);

-- 기존 학생 관리 정책 유지/보강
drop policy if exists "students_read" on public.students;
create policy "students_read"
on public.students
for select
to anon
using (true);

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
