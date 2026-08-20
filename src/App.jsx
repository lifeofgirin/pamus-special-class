import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";

const ADMIN_CODE = "2026180";
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDate(value, withYear = false) {
  const date = parseDateKey(value);
  if (!date) return "";
  const prefix = withYear ? `${date.getFullYear()}년 ` : "";
  return `${prefix}${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY[date.getDay()]})`;
}

function weekdayName(value) {
  const date = parseDateKey(value);
  if (!date) return "";
  return `${WEEKDAY[date.getDay()]}요일`;
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : "";
}

function Logo({ small = false }) {
  return (
    <img
      src="/logo.webp"
      alt="Pamus Grit English"
      className={small ? "brand-logo small" : "brand-logo"}
    />
  );
}

function Home({ onStudent, onAdmin }) {
  return (
    <div className="landing-shell">
      <main className="landing-card">
        <header className="brand-row">
          <Logo />
          <div>
            <div className="brand-title">Pamus Grit English</div>
            <div className="brand-sub">Weekend Special Class</div>
          </div>
        </header>

        <section className="hero">
          <span className="pill">WEEKEND CLASS</span>
          <h1>주말특강<br />신청하기</h1>
          <p>원하는 날짜와 시간을 확인하고 특강을 간편하게 신청하세요.</p>
        </section>

        <div className="role-list">
          <button className="role-card role-dark" onClick={onStudent}>
            <span className="role-icon">🎓</span>
            <span>
              <strong>학생 · 학부모</strong>
              <small>학생 확인 후 특강 신청</small>
            </span>
            <b>→</b>
          </button>

          <button className="role-card" onClick={onAdmin}>
            <span className="role-icon">⚙️</span>
            <span>
              <strong>관리자</strong>
              <small>특강 · 학생 · 신청자 관리</small>
            </span>
            <b>→</b>
          </button>
        </div>
      </main>
    </div>
  );
}

function StudentLogin({ onBack, onSuccess }) {
  const [name, setName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e) {
    e.preventDefault();
    const cleanName = name.replace(/\s+/g, "");

    if (!cleanName || phoneLast4.length !== 4) {
      alert("학생 이름과 전화번호 뒤 4자리를 확인해주세요.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id,name,phone_last4");
    setLoading(false);

    if (error) {
      console.error(error);
      alert("학생 정보를 확인하지 못했습니다.");
      return;
    }

    const student = (data || []).find(
      (item) =>
        String(item.name || "").replace(/\s+/g, "") === cleanName &&
        String(item.phone_last4 || "") === phoneLast4
    );

    if (!student) {
      alert("등록된 학생 정보를 찾을 수 없습니다.");
      return;
    }

    onSuccess(student);
  }

  return (
    <div className="center-shell">
      <main className="panel login-panel">
        <button className="back" onClick={onBack}>←</button>
        <div className="panel-head">
          <Logo small />
          <h2>학생 확인</h2>
          <p>학원에 등록된 학생 정보를 입력해주세요.</p>
        </div>

        <form className="form" onSubmit={login}>
          <label>
            학생 이름
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김도훈"
            />
          </label>

          <label>
            학생 전화번호 뒤 4자리
            <input
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
            />
          </label>

          <button className="primary-btn" disabled={loading}>
            {loading ? "확인 중..." : "확인하고 들어가기"}
          </button>
        </form>
      </main>
    </div>
  );
}

function StudentDashboard({ student, onLogout }) {
  const [classes, setClasses] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function loadData() {
    setLoading(true);

    const [
      { data: classData, error: classError },
      { data: mineData, error: mineError },
      { data: allData, error: allError },
    ] = await Promise.all([
      supabase
        .from("special_classes")
        .select("id,title,class_date,start_time,capacity,is_closed,created_at")
        .order("class_date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("registrations")
        .select("id,special_class_id")
        .eq("student_id", student.id),
      supabase.from("registrations").select("special_class_id"),
    ]);

    setLoading(false);

    if (classError || mineError || allError) {
      console.error(classError || mineError || allError);
      alert("특강 정보를 불러오지 못했습니다.");
      return;
    }

    const counts = {};
    (allData || []).forEach((row) => {
      counts[row.special_class_id] = (counts[row.special_class_id] || 0) + 1;
    });

    const today = toDateKey(new Date());
    setClasses(
      (classData || [])
        .filter((item) => item.class_date && item.class_date >= today)
        .map((item) => ({
          ...item,
          current: counts[item.id] || 0,
        }))
    );
    setMyRegistrations(mineData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const isRegistered = (id) =>
    myRegistrations.some((row) => row.special_class_id === id);

  async function apply(item) {
    if (isRegistered(item.id)) return;

    if (item.is_closed) {
      alert("관리자가 신청을 마감한 특강입니다.");
      return;
    }

    const { count, error: countError } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("special_class_id", item.id);

    if (countError) {
      alert("신청 인원을 확인하지 못했습니다.");
      return;
    }

    if ((count || 0) >= item.capacity) {
      alert("방금 신청이 마감되었습니다.");
      await loadData();
      return;
    }

    setBusyId(item.id);
    const { error } = await supabase.from("registrations").insert({
      student_id: student.id,
      special_class_id: item.id,
    });
    setBusyId(null);

    if (error) {
      console.error(error);
      alert("신청 중 오류가 발생했습니다. 이미 신청했는지 확인해주세요.");
      return;
    }

    await loadData();
    alert("특강 신청이 완료되었습니다.");
  }

  async function cancel(item) {
    const reg = myRegistrations.find((row) => row.special_class_id === item.id);
    if (!reg) return;
    if (!confirm(`${item.title} 신청을 취소할까요?`)) return;

    setBusyId(item.id);
    const { error } = await supabase.from("registrations").delete().eq("id", reg.id);
    setBusyId(null);

    if (error) {
      alert("신청 취소 중 오류가 발생했습니다.");
      return;
    }

    await loadData();
  }

  const grouped = useMemo(() => {
    const map = new Map();
    classes.forEach((item) => {
      if (!map.has(item.class_date)) map.set(item.class_date, []);
      map.get(item.class_date).push(item);
    });
    return [...map.entries()];
  }, [classes]);

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <Logo small />
          <div>
            <strong>Pamus Grit English</strong>
            <span>{student.name} 학생</span>
          </div>
        </div>
        <button onClick={onLogout}>나가기</button>
      </header>

      <main className="content">
        <section className="welcome">
          <span className="pill">WEEKEND CLASS</span>
          <h1>{student.name} 학생,<br />특강을 선택하세요.</h1>
          <p>날짜와 시간을 확인한 뒤 신청해주세요.</p>
        </section>

        {loading ? (
          <div className="empty-box">특강을 불러오는 중...</div>
        ) : grouped.length === 0 ? (
          <div className="empty-box">현재 신청 가능한 특강이 없습니다.</div>
        ) : (
          <div className="date-groups">
            {grouped.map(([date, items]) => (
              <section className="date-section" key={date}>
                <div className="date-heading">
                  <strong>{formatDate(date)}</strong>
                  <span>{items.length}개 특강</span>
                </div>

                <div className="class-grid">
                  {items.map((item) => {
                    const mine = isRegistered(item.id);
                    const full = item.current >= item.capacity;
                    const closed = item.is_closed || full;
                    const percent = Math.min(
                      100,
                      (item.current / Math.max(item.capacity, 1)) * 100
                    );

                    return (
                      <article className={`class-card ${item.is_closed ? "closed-card" : ""}`} key={item.id}>
                        <div className="class-card-top">
                          <div className="class-day">{formatTime(item.start_time)}</div>
                          {item.is_closed && <span className="closed-badge">신청마감</span>}
                        </div>

                        <h3>{item.title}</h3>

                        <div className="capacity-line">
                          <span>신청 현황</span>
                          <strong>{item.current} / {item.capacity}명</strong>
                        </div>

                        <div className="bar">
                          <div style={{ width: `${percent}%` }} />
                        </div>

                        {mine ? (
                          <button
                            className="cancel-btn"
                            disabled={busyId === item.id}
                            onClick={() => cancel(item)}
                          >
                            신청완료 · 취소하기
                          </button>
                        ) : (
                          <button
                            className="primary-btn"
                            disabled={closed || busyId === item.id}
                            onClick={() => apply(item)}
                          >
                            {item.is_closed
                              ? "관리자 마감"
                              : full
                              ? "정원 마감"
                              : busyId === item.id
                              ? "신청 중..."
                              : "신청하기"}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AdminLogin({ onBack, onSuccess }) {
  const [code, setCode] = useState("");

  function submit(e) {
    e.preventDefault();

    if (code !== ADMIN_CODE) {
      alert("관리자 비밀번호가 올바르지 않습니다.");
      return;
    }

    onSuccess();
  }

  return (
    <div className="center-shell">
      <main className="panel login-panel">
        <button className="back" onClick={onBack}>←</button>
        <div className="panel-head">
          <Logo small />
          <h2>관리자 로그인</h2>
          <p>주말특강 관리 페이지입니다.</p>
        </div>

        <form className="form" onSubmit={submit}>
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
      </main>
    </div>
  );
}

function MultiDateCalendar({ selected, onChange }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= lastDate; d += 1) cells.push(new Date(year, month, d));

  function toggle(date) {
    const key = toDateKey(date);
    const set = new Set(selected);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    onChange([...set].sort());
  }

  function addWeekends() {
    const set = new Set(selected);
    for (let d = 1; d <= lastDate; d += 1) {
      const date = new Date(year, month, d);
      if (date.getDay() === 0 || date.getDay() === 6) {
        set.add(toDateKey(date));
      }
    }
    onChange([...set].sort());
  }

  return (
    <div className="calendar-card">
      <div className="calendar-toolbar">
        <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
        <strong>{year}년 {month + 1}월</strong>
        <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div className="calendar-actions">
        <button type="button" onClick={addWeekends}>이번 달 토·일 모두 선택</button>
        <button type="button" onClick={() => onChange([])}>선택 초기화</button>
      </div>

      <div className="calendar-grid calendar-week">
        {WEEKDAY.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="calendar-grid">
        {cells.map((date, index) =>
          date ? (
            <button
              type="button"
              key={toDateKey(date)}
              className={`calendar-day ${selected.includes(toDateKey(date)) ? "selected" : ""}`}
              onClick={() => toggle(date)}
            >
              <span>{date.getDate()}</span>
              <small>{WEEKDAY[date.getDay()]}</small>
            </button>
          ) : (
            <span key={`blank-${index}`} />
          )
        )}
      </div>

      <div className="selected-dates">
        <span>선택된 날짜 {selected.length}개</span>
        <div>
          {selected.map((date) => (
            <button type="button" key={date} onClick={() => toggle(parseDateKey(date))}>
              {formatDate(date)} ×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentManager({ students, onRefresh, onViewStudent }) {
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  async function addStudent() {
    const cleanName = name.trim();
    const cleanPhone = phoneLast4.replace(/\D/g, "").slice(0, 4);

    if (!cleanName || cleanPhone.length !== 4) {
      alert("학생 이름과 전화번호 뒤 4자리를 입력해주세요.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("students").insert({
      name: cleanName,
      phone_last4: cleanPhone,
    });
    setBusy(false);

    if (error) {
      console.error(error);
      alert("학생 등록에 실패했습니다.");
      return;
    }

    setName("");
    setPhoneLast4("");
    await onRefresh();
  }

  async function removeStudent(student) {
    if (!confirm(`${student.name} 학생을 삭제할까요?`)) return;

    await supabase.from("registrations").delete().eq("student_id", student.id);
    const { error } = await supabase.from("students").delete().eq("id", student.id);

    if (error) {
      alert("학생 삭제에 실패했습니다.");
      return;
    }

    await onRefresh();
  }

  function parseCsvLine(line) {
    const out = [];
    let value = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          value += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === "," && !quoted) {
        out.push(value.trim());
        value = "";
      } else {
        value += char;
      }
    }

    out.push(value.trim());
    return out;
  }

  async function importCsv(file) {
    if (!file) return;

    const text = await file.text();
    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      alert("CSV 파일이 비어 있습니다.");
      return;
    }

    const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
    const nameIndex = header.indexOf("name");
    const phoneIndex = header.indexOf("phone_last4");

    if (nameIndex === -1 || phoneIndex === -1) {
      alert("CSV 첫 줄에 name, phone_last4 컬럼이 필요합니다.");
      return;
    }

    const rows = lines
      .slice(1)
      .map(parseCsvLine)
      .map((cells) => ({
        name: String(cells[nameIndex] || "").trim(),
        phone_last4: String(cells[phoneIndex] || "")
          .replace(/\D/g, "")
          .slice(-4)
          .padStart(4, "0"),
      }))
      .filter((row) => row.name && row.phone_last4.length === 4);

    if (!rows.length) {
      alert("등록할 학생이 없습니다.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("students").insert(rows);
    setBusy(false);

    if (fileRef.current) fileRef.current.value = "";

    if (error) {
      console.error(error);
      alert("CSV 등록에 실패했습니다.");
      return;
    }

    await onRefresh();
    alert(`${rows.length}명 등록 완료!`);
  }

  const filtered = students.filter((student) =>
    String(student.name || "").toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <section className="admin-panel">
      <div className="section-title">
        <div>
          <h3>학생 관리</h3>
          <p>사이트에서 바로 추가하거나 CSV로 한꺼번에 등록할 수 있습니다.</p>
        </div>
        <strong>{students.length}명</strong>
      </div>

      <div className="student-add-grid">
        <label>
          학생 이름
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김도훈" />
        </label>

        <label>
          전화번호 뒤 4자리
          <input
            value={phoneLast4}
            onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="0000"
            inputMode="numeric"
          />
        </label>

        <button type="button" className="primary-btn" onClick={addStudent} disabled={busy}>
          학생 추가
        </button>
      </div>

      <div className="csv-upload">
        <div>
          <strong>CSV 일괄등록</strong>
          <span>엑셀에서 name, phone_last4 두 열로 CSV 저장 후 선택</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => importCsv(e.target.files?.[0])}
          disabled={busy}
        />
      </div>

      <input
        className="search-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="학생 이름 검색"
      />

      <div className="student-list">
        {filtered.length === 0 ? (
          <div className="empty-box">등록된 학생이 없습니다.</div>
        ) : (
          filtered.map((student) => (
            <div className="student-row" key={student.id}>
              <button className="student-info-button" type="button" onClick={() => onViewStudent(student.id)}>
                <strong>{student.name}</strong>
                <span>****{student.phone_last4}</span>
              </button>
              <div className="student-row-actions">
                <button type="button" onClick={() => onViewStudent(student.id)}>신청내역</button>
                <button type="button" className="delete-text" onClick={() => removeStudent(student)}>삭제</button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Timetable({ classes, counts, onSelect }) {
  const dates = useMemo(
    () => [...new Set(classes.map((item) => item.class_date).filter(Boolean))].sort(),
    [classes]
  );

  const times = useMemo(
    () => [...new Set(classes.map((item) => formatTime(item.start_time)).filter(Boolean))].sort(),
    [classes]
  );

  if (!classes.length) {
    return <div className="empty-box">특강을 만들면 여기에 타임테이블이 표시됩니다.</div>;
  }

  return (
    <div className="timetable-scroll">
      <table className="timetable">
        <thead>
          <tr>
            <th className="sticky-time">시간</th>
            {dates.map((date) => (
              <th key={date}>
                <strong>{formatDate(date)}</strong>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {times.map((time) => (
            <tr key={time}>
              <th className="sticky-time">{time}</th>

              {dates.map((date) => {
                const items = classes.filter(
                  (item) =>
                    item.class_date === date &&
                    formatTime(item.start_time) === time
                );

                return (
                  <td key={`${date}-${time}`}>
                    <div className="cell-stack">
                      {items.map((item) => (
                        <button
                          type="button"
                          className={`schedule-block ${item.is_closed ? "schedule-closed" : ""}`}
                          key={item.id}
                          onClick={() => onSelect(item.id)}
                        >
                          <strong>{item.title}</strong>
                          <span>{counts[item.id] || 0}/{item.capacity}명 {item.is_closed ? "· 마감" : ""}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("classes");
  const [classes, setClasses] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [students, setStudents] = useState([]);
  const [counts, setCounts] = useState({});
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    class_date: "",
    start_time: "",
    capacity: 1,
  });
  const [form, setForm] = useState({
    title: "",
    start_time: "10:00",
    capacity: 10,
  });
  const [creating, setCreating] = useState(false);

  async function loadData() {
    const [
      { data: classData, error: classError },
      { data: regData, error: regError },
      { data: studentData, error: studentError },
    ] = await Promise.all([
      supabase
        .from("special_classes")
        .select("id,title,class_date,start_time,capacity,is_closed,created_at")
        .order("class_date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase.from("registrations").select("*"),
      supabase.from("students").select("id,name,phone_last4").order("name"),
    ]);

    if (classError || regError || studentError) {
      console.error(classError || regError || studentError);
      alert("관리 데이터를 불러오지 못했습니다.");
      return;
    }

    const map = {};
    (regData || []).forEach((row) => {
      map[row.special_class_id] = (map[row.special_class_id] || 0) + 1;
    });

    setClasses(classData || []);
    setRegistrations(regData || []);
    setStudents(studentData || []);
    setCounts(map);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createClasses(e) {
    e.preventDefault();

    if (!form.title.trim() || !form.start_time || Number(form.capacity) < 1) {
      alert("특강 제목, 시간, 정원을 확인해주세요.");
      return;
    }

    if (!selectedDates.length) {
      alert("달력에서 날짜를 하나 이상 선택해주세요.");
      return;
    }

    const rows = selectedDates.map((date) => ({
      title: form.title.trim(),
      class_date: date,
      day: weekdayName(date),
      start_time: form.start_time,
      capacity: Number(form.capacity),
      is_closed: false,
    }));

    setCreating(true);
    const { error } = await supabase.from("special_classes").insert(rows);
    setCreating(false);

    if (error) {
      console.error(error);
      alert("특강 생성에 실패했습니다.");
      return;
    }

    alert(`${selectedDates.length}개 날짜에 특강을 만들었습니다.`);
    setSelectedDates([]);
    setForm({ title: "", start_time: "10:00", capacity: 10 });
    await loadData();
  }

  async function deleteClass(id) {
    const item = classes.find((row) => row.id === id);
    if (!item) return;
    if (!confirm(`${formatDate(item.class_date)} ${item.title} 특강을 삭제할까요?`)) return;

    const { error: regError } = await supabase
      .from("registrations")
      .delete()
      .eq("special_class_id", id);

    if (regError) {
      alert("신청 내역 삭제에 실패했습니다.");
      return;
    }

    const { error } = await supabase.from("special_classes").delete().eq("id", id);

    if (error) {
      alert("특강 삭제에 실패했습니다.");
      return;
    }

    setSelectedClassId(null);
    await loadData();
  }

  async function toggleClosed(item) {
    const { error } = await supabase
      .from("special_classes")
      .update({ is_closed: !item.is_closed })
      .eq("id", item.id);

    if (error) {
      console.error(error);
      alert("마감 상태 변경에 실패했습니다.");
      return;
    }

    await loadData();
  }

  function beginEdit(item) {
    setEditForm({
      title: item.title,
      class_date: item.class_date,
      start_time: formatTime(item.start_time),
      capacity: item.capacity,
    });
    setEditing(true);
  }

  async function saveEdit(e) {
    e.preventDefault();

    if (!editForm.title.trim() || !editForm.class_date || !editForm.start_time || Number(editForm.capacity) < 1) {
      alert("수정 정보를 확인해주세요.");
      return;
    }

    const { error } = await supabase
      .from("special_classes")
      .update({
        title: editForm.title.trim(),
        class_date: editForm.class_date,
        day: weekdayName(editForm.class_date),
        start_time: editForm.start_time,
        capacity: Number(editForm.capacity),
      })
      .eq("id", selectedClassId);

    if (error) {
      console.error(error);
      alert("특강 수정에 실패했습니다.");
      return;
    }

    setEditing(false);
    await loadData();
  }

  const selectedClass = classes.find((item) => item.id === selectedClassId);

  const selectedApplicants = selectedClass
    ? registrations
        .filter((reg) => reg.special_class_id === selectedClass.id)
        .map((reg) => {
          const student = students.find((s) => s.id === reg.student_id);
          return {
            ...reg,
            name: student?.name || "알 수 없음",
            phone_last4: student?.phone_last4 || "",
          };
        })
    : [];

  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const selectedStudentClasses = selectedStudent
    ? registrations
        .filter((reg) => reg.student_id === selectedStudent.id)
        .map((reg) => classes.find((item) => item.id === reg.special_class_id))
        .filter(Boolean)
        .sort((a, b) => {
          const dateCompare = String(a.class_date).localeCompare(String(b.class_date));
          if (dateCompare !== 0) return dateCompare;
          return formatTime(a.start_time).localeCompare(formatTime(b.start_time));
        })
    : [];

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <Logo small />
          <div>
            <strong>Pamus Grit English</strong>
            <span>주말특강 관리자</span>
          </div>
        </div>
        <button onClick={onLogout}>로그아웃</button>
      </header>

      <main className="content admin-content">
        <section className="welcome admin-welcome">
          <span className="pill">ADMIN</span>
          <h1>주말특강 관리</h1>
          <p>학생 등록부터 특강 개설, 수정, 마감, 신청자 확인까지 관리합니다.</p>
        </section>

        <div className="admin-tabs">
          <button
            className={activeTab === "classes" ? "active" : ""}
            onClick={() => setActiveTab("classes")}
          >
            특강 · 타임테이블
          </button>
          <button
            className={activeTab === "students" ? "active" : ""}
            onClick={() => setActiveTab("students")}
          >
            학생 관리 <span>{students.length}</span>
          </button>
        </div>

        {activeTab === "students" ? (
          <StudentManager
            students={students}
            onRefresh={loadData}
            onViewStudent={setSelectedStudentId}
          />
        ) : (
          <>
            <section className="create-layout">
              <form className="admin-panel create-form" onSubmit={createClasses}>
                <div className="section-title">
                  <div>
                    <h3>특강 만들기</h3>
                    <p>달력에서 여러 날짜를 선택해서 한꺼번에 만들 수 있습니다.</p>
                  </div>
                </div>

                <label>
                  특강 제목
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="예: 중등 문법 총정리"
                  />
                </label>

                <div className="form-two">
                  <label>
                    시간
                    <div className="native-wrap">
                      <input
                        type="time"
                        value={form.start_time}
                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      />
                    </div>
                  </label>

                  <label>
                    정원
                    <input
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    />
                  </label>
                </div>

                <button className="primary-btn" disabled={creating}>
                  {creating ? "생성 중..." : `선택한 ${selectedDates.length}개 날짜에 특강 만들기`}
                </button>
              </form>

              <MultiDateCalendar selected={selectedDates} onChange={setSelectedDates} />
            </section>

            <section className="admin-panel timetable-panel">
              <div className="section-title">
                <div>
                  <h3>특강 타임테이블</h3>
                  <p>블록을 누르면 신청자 확인, 수정, 수동 마감을 할 수 있습니다.</p>
                </div>
                <strong>{classes.length}개</strong>
              </div>

              <Timetable classes={classes} counts={counts} onSelect={setSelectedClassId} />
            </section>
          </>
        )}
      </main>

      {selectedClass && (
        <div className="modal-backdrop" onClick={() => { setSelectedClassId(null); setEditing(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setSelectedClassId(null); setEditing(false); }}>×</button>

            {!editing ? (
              <>
                <div className="modal-title-row">
                  <div>
                    <div className="class-day">{formatDate(selectedClass.class_date, true)}</div>
                    <h2>{selectedClass.title}</h2>
                    <p>{formatTime(selectedClass.start_time)} · 신청 {selectedApplicants.length}/{selectedClass.capacity}명</p>
                  </div>
                  {selectedClass.is_closed && <span className="closed-badge">수동 마감</span>}
                </div>

                <div className="modal-action-grid">
                  <button className="secondary-action" onClick={() => beginEdit(selectedClass)}>특강 수정</button>
                  <button className={selectedClass.is_closed ? "open-action" : "close-action"} onClick={() => toggleClosed(selectedClass)}>
                    {selectedClass.is_closed ? "신청 다시 열기" : "신청 수동 마감"}
                  </button>
                </div>

                <div className="applicant-list">
                  {selectedApplicants.length === 0 ? (
                    <div className="empty-box">아직 신청자가 없습니다.</div>
                  ) : (
                    selectedApplicants.map((student, index) => (
                      <button
                        className="applicant-row applicant-button"
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.student_id)}
                      >
                        <b>{index + 1}</b>
                        <span>{student.name}</span>
                        <small>****{student.phone_last4}</small>
                      </button>
                    ))
                  )}
                </div>

                <button className="danger-btn" onClick={() => deleteClass(selectedClass.id)}>
                  이 특강 삭제
                </button>
              </>
            ) : (
              <form className="edit-form" onSubmit={saveEdit}>
                <h2>특강 수정</h2>

                <label>
                  특강 제목
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </label>

                <label>
                  날짜
                  <div className="native-wrap">
                    <input
                      type="date"
                      value={editForm.class_date}
                      onChange={(e) => setEditForm({ ...editForm, class_date: e.target.value })}
                    />
                  </div>
                </label>

                <div className="form-two">
                  <label>
                    시간
                    <div className="native-wrap">
                      <input
                        type="time"
                        value={editForm.start_time}
                        onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                      />
                    </div>
                  </label>

                  <label>
                    정원
                    <input
                      type="number"
                      min="1"
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                    />
                  </label>
                </div>

                <div className="modal-action-grid">
                  <button type="button" className="secondary-action" onClick={() => setEditing(false)}>취소</button>
                  <button className="primary-btn">수정 저장</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="modal-backdrop student-modal-layer" onClick={() => setSelectedStudentId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedStudentId(null)}>×</button>
            <div className="class-day">학생 신청내역</div>
            <h2>{selectedStudent.name}</h2>
            <p>전화번호 ****{selectedStudent.phone_last4} · 총 {selectedStudentClasses.length}개 신청</p>

            <div className="student-registration-list">
              {selectedStudentClasses.length === 0 ? (
                <div className="empty-box">신청한 특강이 없습니다.</div>
              ) : (
                selectedStudentClasses.map((item) => (
                  <div className="student-registration-card" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{formatDate(item.class_date)} · {formatTime(item.start_time)}</span>
                    </div>
                    <span className={item.is_closed ? "tiny-status closed" : "tiny-status"}>
                      {item.is_closed ? "마감" : "신청중"}
                    </span>
                  </div>
                ))
              )}
            </div>
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
