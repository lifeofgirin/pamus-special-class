import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const ADMIN_CODE = "2026180";

function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function normalizeDay(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (raw.endsWith("요일")) return raw;
  return `${raw}요일`;
}

function Home({ onStudent, onAdmin }) {
  return (
    <div className="landing-shell">
      <div className="landing-card">
        <header className="brand-row">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-title">Pamus Grit English</div>
            <div className="brand-sub">Weekend Special Class</div>
          </div>
        </header>

        <section className="hero">
          <span className="pill">WEEKEND CLASS</span>
          <h1>주말특강<br />신청하기</h1>
          <p>원하는 주말특강을 빠르게 확인하고 신청할 수 있습니다.</p>
        </section>

        <div className="role-list">
          <button className="role-card role-dark" onClick={onStudent}>
            <span className="role-emoji">🎓</span>
            <span>
              <strong>학생 · 학부모</strong>
              <small>학생 확인 후 특강 신청</small>
            </span>
            <b>→</b>
          </button>

          <button className="role-card" onClick={onAdmin}>
            <span className="role-emoji">⚙️</span>
            <span>
              <strong>관리자</strong>
              <small>특강 개설 및 신청자 관리</small>
            </span>
            <b>→</b>
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentLogin({ onBack, onSuccess }) {
  const [name, setName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e) => {
    e.preventDefault();

    if (!name.trim() || phoneLast4.length !== 4) {
      alert("학생 이름과 전화번호 뒤 4자리를 확인해주세요.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("students")
      .select("id,name,phone_last4")
      .eq("name", name.trim())
      .eq("phone_last4", phoneLast4)
      .limit(1);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("학생 정보를 확인하는 중 오류가 발생했습니다. Supabase RLS 정책을 확인해주세요.");
      return;
    }

    if (!data?.length) {
      alert("등록된 학생 정보를 찾을 수 없습니다.");
      return;
    }

    onSuccess(data[0]);
  };

  return (
    <div className="center-shell">
      <div className="panel login-panel">
        <button className="back" onClick={onBack}>←</button>
        <div className="panel-head">
          <div className="mini-mark">P</div>
          <h2>학생 확인</h2>
          <p>학원에 등록된 학생 정보를 입력해주세요.</p>
        </div>

        <form onSubmit={login} className="form">
          <label>
            학생 이름
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 장민준"
              autoComplete="name"
            />
          </label>

          <label>
            학생 전화번호 뒤 4자리
            <input
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
              autoComplete="tel"
            />
          </label>

          <button className="primary-btn" disabled={loading}>
            {loading ? "확인 중..." : "확인하고 들어가기"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StudentDashboard({ student, onLogout }) {
  const [classes, setClasses] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadData = async () => {
    setLoading(true);

    const [{ data: classData, error: classError }, { data: regData, error: regError }] =
      await Promise.all([
        supabase
          .from("special_classes")
          .select("id,title,day,start_time,capacity,created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("registrations")
          .select("id,special_class_id")
          .eq("student_id", student.id),
      ]);

    if (classError || regError) {
      console.error(classError || regError);
      alert("특강 정보를 불러오지 못했습니다. Supabase RLS 정책을 확인해주세요.");
      setLoading(false);
      return;
    }

    const { data: allRegs, error: allRegsError } = await supabase
      .from("registrations")
      .select("special_class_id");

    if (allRegsError) {
      console.error(allRegsError);
    }

    const counts = {};
    (allRegs || []).forEach((r) => {
      counts[r.special_class_id] = (counts[r.special_class_id] || 0) + 1;
    });

    setClasses((classData || []).map((c) => ({
      ...c,
      current: counts[c.id] || 0,
    })));
    setMyRegistrations(regData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isRegistered = (classId) =>
    myRegistrations.some((r) => r.special_class_id === classId);

  const apply = async (item) => {
    if (isRegistered(item.id)) return;
    if (item.current >= item.capacity) {
      alert("신청이 마감된 특강입니다.");
      return;
    }

    setBusyId(item.id);

    const { error } = await supabase
      .from("registrations")
      .insert({
        student_id: student.id,
        special_class_id: item.id,
      });

    setBusyId(null);

    if (error) {
      console.error(error);
      alert("신청 중 오류가 발생했습니다. 이미 신청했거나 Supabase 정책 설정이 필요할 수 있습니다.");
      return;
    }

    await loadData();
    alert("특강 신청이 완료되었습니다.");
  };

  const cancel = async (item) => {
    if (!confirm(`${item.title} 신청을 취소할까요?`)) return;

    const reg = myRegistrations.find((r) => r.special_class_id === item.id);
    if (!reg) return;

    setBusyId(item.id);

    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("id", reg.id);

    setBusyId(null);

    if (error) {
      console.error(error);
      alert("신청 취소 중 오류가 발생했습니다.");
      return;
    }

    await loadData();
  };

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <strong>Pamus Grit English</strong>
          <span>{student.name} 학생</span>
        </div>
        <button onClick={onLogout}>나가기</button>
      </header>

      <main className="content">
        <section className="welcome">
          <span className="pill">WEEKEND CLASS</span>
          <h1>{student.name} 학생,<br />원하는 특강을 선택하세요.</h1>
          <p>신청 인원이 정원에 도달하면 자동으로 마감됩니다.</p>
        </section>

        {loading ? (
          <div className="empty-box">특강을 불러오는 중...</div>
        ) : classes.length === 0 ? (
          <div className="empty-box">현재 신청 가능한 특강이 없습니다.</div>
        ) : (
          <section className="class-grid">
            {classes.map((item) => {
              const mine = isRegistered(item.id);
              const full = item.current >= item.capacity;
              const percent = Math.min(100, (item.current / Math.max(item.capacity, 1)) * 100);

              return (
                <article className="class-card" key={item.id}>
                  <div className="class-day">{normalizeDay(item.day)}</div>
                  <h3>{item.title}</h3>
                  <div className="class-time">{formatTime(item.start_time)}</div>

                  <div className="capacity-line">
                    <span>신청 현황</span>
                    <strong>{item.current} / {item.capacity}명</strong>
                  </div>
                  <div className="bar"><div style={{ width: `${percent}%` }} /></div>

                  {mine ? (
                    <button className="cancel-btn" disabled={busyId === item.id} onClick={() => cancel(item)}>
                      {busyId === item.id ? "처리 중..." : "신청완료 · 취소하기"}
                    </button>
                  ) : (
                    <button
                      className="primary-btn"
                      disabled={full || busyId === item.id}
                      onClick={() => apply(item)}
                    >
                      {full ? "신청 마감" : busyId === item.id ? "신청 중..." : "신청하기"}
                    </button>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

function AdminLogin({ onBack, onSuccess }) {
  const [code, setCode] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (code !== ADMIN_CODE) {
      alert("관리자 비밀번호가 올바르지 않습니다.");
      return;
    }
    onSuccess();
  };

  return (
    <div className="center-shell">
      <div className="panel login-panel">
        <button className="back" onClick={onBack}>←</button>
        <div className="panel-head">
          <div className="mini-mark">P</div>
          <h2>관리자 로그인</h2>
          <p>주말특강 관리 페이지입니다.</p>
        </div>

        <form onSubmit={submit} className="form">
          <label>
            관리자 비밀번호
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="비밀번호"
            />
          </label>
          <button className="primary-btn">관리자 로그인</button>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout }) {
  const [classes, setClasses] = useState([]);
  const [counts, setCounts] = useState({});
  const [students, setStudents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    day: "토요일",
    start_time: "10:00",
    capacity: 10,
  });

  const loadData = async () => {
    const [{ data: classData, error: classError }, { data: regData }, { data: studentData }] =
      await Promise.all([
        supabase.from("special_classes").select("*").order("created_at", { ascending: true }),
        supabase.from("registrations").select("*"),
        supabase.from("students").select("id,name,phone_last4"),
      ]);

    if (classError) {
      console.error(classError);
      alert("관리 데이터를 불러오지 못했습니다. Supabase RLS 정책을 확인해주세요.");
      return;
    }

    const map = {};
    (regData || []).forEach((r) => {
      map[r.special_class_id] = (map[r.special_class_id] || 0) + 1;
    });

    setClasses(classData || []);
    setRegistrations(regData || []);
    setStudents(studentData || []);
    setCounts(map);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createClass = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.day || !form.start_time || Number(form.capacity) < 1) {
      alert("특강 정보를 모두 입력해주세요.");
      return;
    }

    const { error } = await supabase
      .from("special_classes")
      .insert({
        title: form.title.trim(),
        day: form.day,
        start_time: form.start_time,
        capacity: Number(form.capacity),
      });

    if (error) {
      console.error(error);
      alert("특강 생성에 실패했습니다. Supabase 정책을 확인해주세요.");
      return;
    }

    setForm({
      title: "",
      day: "토요일",
      start_time: "10:00",
      capacity: 10,
    });
    await loadData();
  };

  const deleteClass = async (id) => {
    if (!confirm("이 특강을 삭제할까요? 신청 내역도 함께 삭제해야 할 수 있습니다.")) return;

    await supabase.from("registrations").delete().eq("special_class_id", id);
    const { error } = await supabase.from("special_classes").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("특강 삭제에 실패했습니다.");
      return;
    }

    if (selectedId === id) setSelectedId(null);
    await loadData();
  };

  const selectedClass = classes.find((c) => c.id === selectedId);
  const selectedRegs = registrations.filter((r) => r.special_class_id === selectedId);

  const selectedApplicants = selectedRegs.map((reg) => {
    const student = students.find((s) => s.id === reg.student_id);
    return {
      ...reg,
      name: student?.name || "알 수 없음",
      phone_last4: student?.phone_last4 || "",
    };
  });

  const copyApplicants = async () => {
    if (!selectedClass) return;
    const text = [
      `[${normalizeDay(selectedClass.day)} ${formatTime(selectedClass.start_time)} ${selectedClass.title} 신청자]`,
      "",
      ...selectedApplicants.map((s, i) => `${i + 1}. ${s.name}`),
      "",
      `총 ${selectedApplicants.length}명 / 정원 ${selectedClass.capacity}명`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    alert("신청자 명단을 복사했습니다.");
  };

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <strong>Pamus Grit English</strong>
          <span>주말특강 관리자</span>
        </div>
        <button onClick={onLogout}>로그아웃</button>
      </header>

      <main className="content admin-content">
        <section className="welcome">
          <span className="pill">ADMIN</span>
          <h1>특강 관리</h1>
          <p>요일, 시간, 정원, 제목만 입력하면 바로 학생 화면에 표시됩니다.</p>
        </section>

        <section className="admin-layout">
          <form className="create-card" onSubmit={createClass}>
            <h3>새 특강 만들기</h3>

            <label>
              특강 제목
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: 문법 총정리"
              />
            </label>

            <div className="two-col">
              <label>
                요일
                <select
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: e.target.value })}
                >
                  <option>토요일</option>
                  <option>일요일</option>
                  <option>금요일</option>
                  <option>월요일</option>
                  <option>화요일</option>
                  <option>수요일</option>
                  <option>목요일</option>
                </select>
              </label>

              <label>
                시간
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </label>
            </div>

            <label>
              정원
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </label>

            <button className="primary-btn">특강 만들기</button>
          </form>

          <section className="admin-list">
            <div className="section-title">
              <h3>개설된 특강</h3>
              <span>{classes.length}개</span>
            </div>

            {classes.length === 0 ? (
              <div className="empty-box">아직 등록된 특강이 없습니다.</div>
            ) : (
              classes.map((item) => (
                <article className="admin-item" key={item.id}>
                  <div>
                    <span>{normalizeDay(item.day)} · {formatTime(item.start_time)}</span>
                    <h4>{item.title}</h4>
                    <p>{counts[item.id] || 0} / {item.capacity}명 신청</p>
                  </div>
                  <div className="admin-actions">
                    <button onClick={() => setSelectedId(item.id)}>신청자</button>
                    <button className="danger" onClick={() => deleteClass(item.id)}>삭제</button>
                  </div>
                </article>
              ))
            )}
          </section>
        </section>
      </main>

      {selectedClass && (
        <div className="modal-backdrop" onClick={() => setSelectedId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedId(null)}>×</button>
            <div className="class-day">{normalizeDay(selectedClass.day)} · {formatTime(selectedClass.start_time)}</div>
            <h2>{selectedClass.title}</h2>
            <p>신청 {selectedApplicants.length}명 / 정원 {selectedClass.capacity}명</p>

            <div className="applicant-list">
              {selectedApplicants.length === 0 ? (
                <div className="empty-box">아직 신청자가 없습니다.</div>
              ) : (
                selectedApplicants.map((student, index) => (
                  <div className="applicant" key={student.id}>
                    <b>{index + 1}</b>
                    <span>{student.name}</span>
                    <small>****{student.phone_last4}</small>
                  </div>
                ))
              )}
            </div>

            <button className="primary-btn" onClick={copyApplicants}>신청자 명단 복사</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [student, setStudent] = useState(null);
  const [admin, setAdmin] = useState(false);

  if (view === "student-login") {
    return (
      <StudentLogin
        onBack={() => setView("home")}
        onSuccess={(data) => {
          setStudent(data);
          setView("student-home");
        }}
      />
    );
  }

  if (view === "student-home" && student) {
    return (
      <StudentDashboard
        student={student}
        onLogout={() => {
          setStudent(null);
          setView("home");
        }}
      />
    );
  }

  if (view === "admin-login") {
    return (
      <AdminLogin
        onBack={() => setView("home")}
        onSuccess={() => {
          setAdmin(true);
          setView("admin-home");
        }}
      />
    );
  }

  if (view === "admin-home" && admin) {
    return (
      <AdminDashboard
        onLogout={() => {
          setAdmin(false);
          setView("home");
        }}
      />
    );
  }

  return (
    <Home
      onStudent={() => setView("student-login")}
      onAdmin={() => setView("admin-login")}
    />
  );
}
