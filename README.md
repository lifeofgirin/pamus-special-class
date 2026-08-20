# Pamus Grit 주말특강

GitHub + Vercel + Supabase 기반의 주말특강 신청 페이지입니다.

## 사용 중인 Supabase 테이블

### students
- id
- name
- phone_last4
- created_at

### special_classes
- id
- title
- day
- start_time
- capacity
- created_at

### registrations
- id
- student_id
- special_class_id
- created_at

## GitHub에 업로드한 뒤

1. Supabase > SQL Editor에서 `supabase_setup.sql` 내용을 실행합니다.
2. Vercel에서 이 GitHub repository를 Import합니다.
3. Framework Preset은 Vite로 자동 인식되면 그대로 Deploy합니다.
4. 관리자 비밀번호 기본값은 `1004`입니다.

## 주의

현재 버전은 가장 단순하게 작동하도록 만들어져 관리자 비밀번호가 프론트 코드에 들어 있고,
Supabase anon 사용자가 필요한 테이블을 읽고 쓸 수 있는 정책을 사용합니다.
실제 외부 공개 운영 전에는 관리자 인증과 RLS를 더 강하게 만드는 것을 권장합니다.
