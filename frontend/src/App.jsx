import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./apiClient";

const TOKEN_KEY = "hostel_token";
const DEFAULT_USER_FILTER = { role: "", search: "" };
const DEFAULT_ATTENDANCE_FILTER = { date: "", status: "" };
const DEFAULT_COMPLAINT_FILTER = { status: "", complaint_type: "" };
const DEFAULT_LEAVE_FILTER = { status: "", student_id: "" };
const DEFAULT_NOTICE_FILTER = { priority: "", target_role: "", active: "" };
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", roles: ["Student", "Warden"] },
  { id: "users", label: "Users", roles: ["Warden"] },
  { id: "rooms", label: "Rooms", roles: ["Warden"] },
  { id: "attendance", label: "Attendance", roles: ["Student", "Warden"] },
  { id: "complaints", label: "Complaints", roles: ["Student", "Warden"] },
  { id: "leaves", label: "Leaves", roles: ["Student", "Warden"] },
  { id: "notices", label: "Notices", roles: ["Student", "Warden"] }
];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const toInputDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const todayInput = () => new Date().toISOString().slice(0, 10);

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [view, setView] = useState("dashboard");
  const [loadingSession, setLoadingSession] = useState(true);
  const [busy, setBusy] = useState(false);

  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [notices, setNotices] = useState([]);

  const [userFilter, setUserFilter] = useState(DEFAULT_USER_FILTER);
  const [attendanceFilter, setAttendanceFilter] = useState(DEFAULT_ATTENDANCE_FILTER);
  const [complaintFilter, setComplaintFilter] = useState(DEFAULT_COMPLAINT_FILTER);
  const [leaveFilter, setLeaveFilter] = useState(DEFAULT_LEAVE_FILTER);
  const [noticeFilter, setNoticeFilter] = useState(DEFAULT_NOTICE_FILTER);

  const [toast, setToast] = useState({ open: false, type: "info", text: "" });

  const isAdmin = user?.role === "Warden";

  const students = useMemo(() => users.filter((entry) => entry.role === "Student"), [users]);
  const staff = useMemo(() => users.filter((entry) => entry.role === "Warden"), [users]);

  const notify = (text, type = "info") => {
    setToast({ open: true, type, text });
    window.clearTimeout(window.__hostelToastTimer);
    window.__hostelToastTimer = window.setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2600);
  };

  const logout = (message) => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setUsers([]);
    setRooms([]);
    setAttendance([]);
    setComplaints([]);
    setLeaves([]);
    setNotices([]);
    setUserFilter(DEFAULT_USER_FILTER);
    setAttendanceFilter(DEFAULT_ATTENDANCE_FILTER);
    setComplaintFilter(DEFAULT_COMPLAINT_FILTER);
    setLeaveFilter(DEFAULT_LEAVE_FILTER);
    setNoticeFilter(DEFAULT_NOTICE_FILTER);
    setView("dashboard");
    if (message) notify(message, "warn");
  };

  const onApiError = (error, fallback) => {
    if (error?.status === 401) {
      logout("Session expired, login again.");
      return;
    }
    notify(error?.message || fallback, "error");
  };

  const loadProfile = async (authToken) => {
    const payload = await apiRequest("/api/users/profile", { token: authToken });
    return payload.data;
  };

  const loadUsers = async (query = userFilter) => {
    if (!isAdmin) return [];
    const payload = await apiRequest("/api/users", { token, query });
    setUsers(payload.data || []);
    return payload.data || [];
  };

  const loadRooms = async () => {
    if (!isAdmin) return [];
    const payload = await apiRequest("/api/rooms", { token });
    setRooms(payload.data || []);
    return payload.data || [];
  };

  const loadAttendance = async (query = attendanceFilter) => {
    const payload = await apiRequest("/api/attendance", { token, query });
    setAttendance(payload.data || []);
    return payload.data || [];
  };

  const loadComplaints = async (query = complaintFilter) => {
    const payload = await apiRequest("/api/complaints", { token, query });
    setComplaints(payload.data || []);
    return payload.data || [];
  };

  const loadLeaves = async (query = leaveFilter) => {
    const payload = await apiRequest("/api/leaves", { token, query });
    setLeaves(payload.data || []);
    return payload.data || [];
  };

  const loadNotices = async (query = noticeFilter) => {
    const payload = await apiRequest("/api/notices", { token, query });
    setNotices(payload.data || []);
    return payload.data || [];
  };

  const refreshAll = async () => {
    if (!token || !user) return;
    setBusy(true);
    try {
      const tasks = [loadAttendance(), loadComplaints(), loadLeaves(), loadNotices()];
      if (isAdmin) tasks.push(loadUsers(), loadRooms());
      await Promise.all(tasks);
      notify("Data refreshed.", "success");
    } catch (error) {
      onApiError(error, "Refresh failed.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setLoadingSession(false);
        return;
      }
      try {
        const profile = await loadProfile(token);
        setUser(profile);
      } catch {
        logout("Please login to continue.");
      } finally {
        setLoadingSession(false);
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    if (user && token) {
      refreshAll();
    }
  }, [user?._id, user?.role, token]);

  const navItems = useMemo(() => (user ? NAV_ITEMS.filter((item) => item.roles.includes(user.role)) : []), [user]);

  useEffect(() => {
    if (!navItems.some((item) => item.id === view) && navItems.length > 0) {
      setView(navItems[0].id);
    }
  }, [view, navItems]);

  const login = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      const payload = await apiRequest("/api/users/login", {
        method: "POST",
        body: { email: formData.get("email"), password: formData.get("password") }
      });
      localStorage.setItem(TOKEN_KEY, payload.token);
      setToken(payload.token);
      setUser(payload.data);
      notify("Login successful.", "success");
      event.currentTarget.reset();
    } catch (error) {
      onApiError(error, "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const register = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      const payload = await apiRequest("/api/users/register", {
        method: "POST",
        body: {
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          role: formData.get("role")
        }
      });
      localStorage.setItem(TOKEN_KEY, payload.token);
      setToken(payload.token);
      setUser(payload.data);
      notify("Account created.", "success");
      event.currentTarget.reset();
    } catch (error) {
      onApiError(error, "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      await apiRequest("/api/users/register", {
        method: "POST",
        body: {
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          role: formData.get("role")
        }
      });
      notify("User created.", "success");
      event.currentTarget.reset();
      await loadUsers();
    } catch (error) {
      onApiError(error, "Cannot create user.");
    } finally {
      setBusy(false);
    }
  };

  const updateRole = async (id, role) => {
    try {
      setBusy(true);
      await apiRequest(`/api/users/${id}`, { method: "PUT", token, body: { role } });
      notify("Role updated.", "success");
      await loadUsers();
    } catch (error) {
      onApiError(error, "Cannot update role.");
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (id) => {
    try {
      setBusy(true);
      await apiRequest(`/api/users/${id}`, { method: "DELETE", token });
      notify("User deleted.", "success");
      await Promise.all([loadUsers(), loadRooms()]);
    } catch (error) {
      onApiError(error, "Cannot delete user.");
    } finally {
      setBusy(false);
    }
  };

  const createRoom = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      await apiRequest("/api/rooms", {
        method: "POST",
        token,
        body: {
          room_number: formData.get("room_number"),
          floor: Number(formData.get("floor")),
          capacity: Number(formData.get("capacity"))
        }
      });
      notify("Room created.", "success");
      event.currentTarget.reset();
      await loadRooms();
    } catch (error) {
      onApiError(error, "Cannot create room.");
    } finally {
      setBusy(false);
    }
  };

  const allocate = async (roomId, studentId) => {
    try {
      setBusy(true);
      await apiRequest(`/api/rooms/${roomId}/allocate`, { method: "POST", token, body: { student_id: studentId } });
      notify("Student allocated.", "success");
      await Promise.all([loadRooms(), loadUsers()]);
    } catch (error) {
      onApiError(error, "Allocation failed.");
    } finally {
      setBusy(false);
    }
  };

  const deallocate = async (roomId, studentId) => {
    try {
      setBusy(true);
      await apiRequest(`/api/rooms/${roomId}/deallocate`, { method: "POST", token, body: { student_id: studentId } });
      notify("Student removed.", "success");
      await Promise.all([loadRooms(), loadUsers()]);
    } catch (error) {
      onApiError(error, "Deallocation failed.");
    } finally {
      setBusy(false);
    }
  };

  const markAttendance = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      await apiRequest("/api/attendance", {
        method: "POST",
        token,
        body: {
          student_id: formData.get("student_id"),
          status: formData.get("status"),
          date: formData.get("date") || undefined
        }
      });
      notify("Attendance saved.", "success");
      await loadAttendance();
    } catch (error) {
      onApiError(error, "Attendance save failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateAttendance = async (id, status) => {
    try {
      setBusy(true);
      await apiRequest(`/api/attendance/${id}`, { method: "PUT", token, body: { status } });
      notify("Attendance updated.", "success");
      await loadAttendance();
    } catch (error) {
      onApiError(error, "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const createComplaint = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      await apiRequest("/api/complaints", {
        method: "POST",
        token,
        body: { complaint_type: formData.get("complaint_type"), description: formData.get("description") }
      });
      notify("Complaint submitted.", "success");
      event.currentTarget.reset();
      await loadComplaints();
    } catch (error) {
      onApiError(error, "Complaint creation failed.");
    } finally {
      setBusy(false);
    }
  };

  const editComplaint = async (event, id, admin = false) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = admin
      ? {
          status: formData.get("status"),
          assigned_to: formData.get("assigned_to") || undefined,
          resolution_note: formData.get("resolution_note")
        }
      : {
          complaint_type: formData.get("complaint_type"),
          description: formData.get("description")
        };
    try {
      setBusy(true);
      await apiRequest(`/api/complaints/${id}`, { method: "PUT", token, body });
      notify("Complaint updated.", "success");
      await loadComplaints();
    } catch (error) {
      onApiError(error, "Complaint update failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteComplaint = async (id) => {
    try {
      setBusy(true);
      await apiRequest(`/api/complaints/${id}`, { method: "DELETE", token });
      notify("Complaint deleted.", "success");
      await loadComplaints();
    } catch (error) {
      onApiError(error, "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const createLeave = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {
      from_date: formData.get("from_date"),
      to_date: formData.get("to_date"),
      reason: formData.get("reason")
    };
    try {
      setBusy(true);
      await apiRequest("/api/leaves", { method: "POST", token, body });
      notify("Leave request created.", "success");
      event.currentTarget.reset();
      await loadLeaves();
    } catch (error) {
      onApiError(error, "Leave request creation failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateLeaveAsStudent = async (event, id) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      await apiRequest(`/api/leaves/${id}`, {
        method: "PUT",
        token,
        body: {
          from_date: formData.get("from_date"),
          to_date: formData.get("to_date"),
          reason: formData.get("reason")
        }
      });
      notify("Leave request updated.", "success");
      await loadLeaves();
    } catch (error) {
      onApiError(error, "Leave update failed.");
    } finally {
      setBusy(false);
    }
  };

  const reviewLeave = async (event, id) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      await apiRequest(`/api/leaves/${id}`, {
        method: "PUT",
        token,
        body: {
          status: formData.get("status"),
          review_note: formData.get("review_note")
        }
      });
      notify("Leave review saved.", "success");
      await loadLeaves();
    } catch (error) {
      onApiError(error, "Leave review failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteLeave = async (id) => {
    try {
      setBusy(true);
      await apiRequest(`/api/leaves/${id}`, { method: "DELETE", token });
      notify("Leave request deleted.", "success");
      await loadLeaves();
    } catch (error) {
      onApiError(error, "Leave delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const createNotice = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      await apiRequest("/api/notices", {
        method: "POST",
        token,
        body: {
          title: formData.get("title"),
          body: formData.get("body"),
          priority: formData.get("priority"),
          target_role: formData.get("target_role"),
          publish_date: formData.get("publish_date") || undefined,
          expires_at: formData.get("expires_at") || null
        }
      });
      notify("Notice published.", "success");
      event.currentTarget.reset();
      await loadNotices();
    } catch (error) {
      onApiError(error, "Notice publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateNotice = async (event, id) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      setBusy(true);
      await apiRequest(`/api/notices/${id}`, {
        method: "PUT",
        token,
        body: {
          title: formData.get("title"),
          body: formData.get("body"),
          priority: formData.get("priority"),
          target_role: formData.get("target_role"),
          publish_date: formData.get("publish_date") || undefined,
          expires_at: formData.get("expires_at") || null,
          is_active: formData.get("is_active") === "true"
        }
      });
      notify("Notice updated.", "success");
      await loadNotices();
    } catch (error) {
      onApiError(error, "Notice update failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteNotice = async (id) => {
    try {
      setBusy(true);
      await apiRequest(`/api/notices/${id}`, { method: "DELETE", token });
      notify("Notice deleted.", "success");
      await loadNotices();
    } catch (error) {
      onApiError(error, "Notice delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const cards = useMemo(() => {
    if (!user) return [];
    if (user.role === "Student") {
      return [
        { label: "Attendance Records", value: attendance.length, accent: "teal" },
        { label: "Complaints", value: complaints.length, accent: "amber" },
        { label: "Leave Requests", value: leaves.length, accent: "lime" },
        { label: "Active Notices", value: notices.filter((entry) => entry.is_active).length, accent: "orange" }
      ];
    }
    return [
      { label: "Students", value: users.filter((entry) => entry.role === "Student").length, accent: "lime" },
      { label: "Rooms", value: rooms.length, accent: "teal" },
      { label: "Pending Complaints", value: complaints.filter((row) => row.status === "Pending").length, accent: "amber" },
      { label: "Pending Leaves", value: leaves.filter((entry) => entry.status === "Pending").length, accent: "orange" }
    ];
  }, [user, users, rooms, attendance, complaints, leaves, notices]);

  if (loadingSession) {
    return <div className="screen-center"><div className="loader" /><p>Loading session...</p></div>;
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="bg-orb orb-a" />
        <div className="bg-orb orb-b" />
        <div className="auth-card">
          <h1>Hostel Flow</h1>
          <p>React dashboard for complete hostel operations.</p>
          <div className="auth-tabs">
            <button type="button" className={`tab-btn ${authMode === "login" ? "active" : ""}`} onClick={() => setAuthMode("login")}>Login</button>
            <button type="button" className={`tab-btn ${authMode === "register" ? "active" : ""}`} onClick={() => setAuthMode("register")}>Register</button>
          </div>
          {authMode === "login" ? (
            <form className="stack-form" onSubmit={login}>
              <input name="email" type="email" placeholder="Email" required />
              <input name="password" type="password" placeholder="Password" required />
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Please wait..." : "Login"}</button>
            </form>
          ) : (
            <form className="stack-form" onSubmit={register}>
              <input name="name" placeholder="Full name" required />
              <input name="email" type="email" placeholder="Email" required />
              <input name="password" type="password" placeholder="Password (8+ chars)" required />
              <select name="role" required><option value="Student">Student</option><option value="Warden">Warden</option></select>
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Please wait..." : "Create account"}</button>
            </form>
          )}
        </div>
        {toast.open && <Toast toast={toast} />}
      </div>
    );
  }

  const studentsWithoutRoom = students.filter((student) => !student.room_id);

  return (
    <div className="app-layout">
      <div className="bg-orb orb-a" />
      <div className="bg-orb orb-b" />

      <aside className="sidebar">
        <div className="brand">
          <span>HM</span>
          <div><h2>Hostel Flow</h2><p>{user.role}</p></div>
        </div>
        <nav className="nav-menu">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-btn ${view === item.id ? "active" : ""}`} type="button" onClick={() => setView(item.id)}>{item.label}</button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div><h1>{view[0].toUpperCase() + view.slice(1)}</h1><p>{`Welcome, ${user.name}`}</p></div>
          <div className="top-actions">
            <button className="btn btn-outline" type="button" disabled={busy} onClick={refreshAll}>Refresh</button>
            <button className="btn btn-danger" type="button" onClick={() => logout()}>Logout</button>
          </div>
        </header>

        {view === "dashboard" && (
          <section className="view-grid">
            <div className="stats-grid">
              {cards.map((card) => (
                <article className={`stat-card ${card.accent}`} key={card.label}><h4>{card.label}</h4><p>{card.value}</p></article>
              ))}
            </div>
            <div className="panel"><h3>Current User</h3><p>Name: {user.name}</p><p>Email: {user.email}</p><p>Role: {user.role}</p></div>
          </section>
        )}

        {view === "users" && isAdmin && (
          <section className="view-grid">
            <div className="panel">
              <h3>Create User</h3>
              <form className="stack-form" onSubmit={createUser}>
                <input name="name" placeholder="Name" required />
                <input name="email" type="email" placeholder="Email" required />
                <input name="password" type="password" placeholder="Password" required />
                <select name="role" required><option value="Student">Student</option><option value="Warden">Warden</option></select>
                <button className="btn btn-primary" type="submit" disabled={busy}>Create</button>
              </form>
            </div>
            <div className="panel">
              <h3>User Directory</h3>
              <form className="row-form" onSubmit={async (event) => { event.preventDefault(); await loadUsers(userFilter); }}>
                <select value={userFilter.role} onChange={(event) => setUserFilter((prev) => ({ ...prev, role: event.target.value }))}>
                  <option value="">All Roles</option><option value="Student">Student</option><option value="Warden">Warden</option>
                </select>
                <input placeholder="Search" value={userFilter.search} onChange={(event) => setUserFilter((prev) => ({ ...prev, search: event.target.value }))} />
                <button className="btn btn-outline" type="submit" disabled={busy}>Filter</button>
              </form>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Room</th><th>Action</th></tr></thead>
                  <tbody>
                    {users.map((entry) => (
                      <tr key={entry._id}>
                        <td>{entry.name}</td>
                        <td>{entry.email}</td>
                        <td>
                          <select value={entry.role} disabled={!isAdmin} onChange={(event) => updateRole(entry._id, event.target.value)}>
                            <option value="Student">Student</option><option value="Warden">Warden</option>
                          </select>
                        </td>
                        <td>{entry.room_id?.room_number || "-"}</td>
                        <td>
                          {isAdmin && entry._id !== user._id
                            ? <button type="button" className="btn-link danger" onClick={() => deleteUser(entry._id)}>Delete</button>
                            : <span className="muted">No action</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {view === "rooms" && isAdmin && (
          <section className="view-grid">
            <div className="panel">
              <h3>Create Room</h3>
              <form className="stack-form" onSubmit={createRoom}>
                <input name="room_number" placeholder="Room number" required />
                <input name="floor" type="number" min="0" placeholder="Floor" required />
                <input name="capacity" type="number" min="1" placeholder="Capacity" required />
                <button className="btn btn-primary" type="submit" disabled={busy}>Create</button>
              </form>
            </div>
            <div className="panel">
              <h3>Room Allocation</h3>
              <div className="cards">
                {rooms.map((room) => (
                  <article className="room-card" key={room._id}>
                    <header><h4>{room.room_number}</h4><span>{`Floor ${room.floor}`}</span></header>
                    <p>{`Occupied ${room.occupied_count}/${room.capacity}`}</p>
                    <div className="occupants">
                      {room.occupants?.length > 0
                        ? room.occupants.map((occupant) => (
                          <div className="occupant-item" key={occupant._id}>
                            <span>{occupant.name}</span>
                            <button className="btn-link" type="button" onClick={() => deallocate(room._id, occupant._id)}>Remove</button>
                          </div>
                        ))
                        : <p className="muted">No occupants</p>}
                    </div>
                    <form className="row-form compact" onSubmit={(event) => { event.preventDefault(); const studentId = event.currentTarget.student_id.value; if (studentId) allocate(room._id, studentId); }}>
                      <select name="student_id" defaultValue=""><option value="">Select student</option>{studentsWithoutRoom.map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}</select>
                      <button className="btn btn-outline" type="submit" disabled={busy}>Allocate</button>
                    </form>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "attendance" && (
          <section className="view-grid">
            {isAdmin && (
              <div className="panel">
                <h3>Mark Attendance</h3>
                <form className="stack-form" onSubmit={markAttendance}>
                  <select name="student_id" required defaultValue=""><option value="">Choose student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}</select>
                  <input name="date" type="date" defaultValue={todayInput()} />
                  <select name="status" required><option value="Present">Present</option><option value="Absent">Absent</option></select>
                  <button className="btn btn-primary" type="submit" disabled={busy}>Save</button>
                </form>
              </div>
            )}
            <div className="panel">
              <h3>Attendance Log</h3>
              <form className="row-form" onSubmit={async (event) => { event.preventDefault(); await loadAttendance(attendanceFilter); }}>
                <input type="date" value={attendanceFilter.date} onChange={(event) => setAttendanceFilter((prev) => ({ ...prev, date: event.target.value }))} />
                <select value={attendanceFilter.status} onChange={(event) => setAttendanceFilter((prev) => ({ ...prev, status: event.target.value }))}><option value="">All Status</option><option value="Present">Present</option><option value="Absent">Absent</option></select>
                <button className="btn btn-outline" type="submit" disabled={busy}>Filter</button>
              </form>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Date</th><th>Status</th><th>Marked By</th><th>Update</th></tr></thead>
                  <tbody>
                    {attendance.map((row) => (
                      <tr key={row._id}>
                        <td>{row.student_id?.name || "-"}</td>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.status}</td>
                        <td>{row.marked_by?.name || "-"}</td>
                        <td>{isAdmin ? <select defaultValue={row.status} onChange={(event) => updateAttendance(row._id, event.target.value)}><option value="Present">Present</option><option value="Absent">Absent</option></select> : <span className="muted">Read only</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {view === "complaints" && (
          <section className="view-grid">
            {!isAdmin && (
              <div className="panel">
                <h3>Create Complaint</h3>
                <form className="stack-form" onSubmit={createComplaint}>
                  <select name="complaint_type" required>
                    <option value="Room">Room</option><option value="Mess">Mess</option><option value="Water">Water</option>
                    <option value="Electricity">Electricity</option><option value="Security">Security</option><option value="Other">Other</option>
                  </select>
                  <textarea name="description" placeholder="Describe the issue..." required />
                  <button className="btn btn-primary" type="submit" disabled={busy}>Submit</button>
                </form>
              </div>
            )}
            <div className="panel">
              <h3>Complaint Board</h3>
              <form className="row-form" onSubmit={async (event) => { event.preventDefault(); await loadComplaints(complaintFilter); }}>
                <select value={complaintFilter.status} onChange={(event) => setComplaintFilter((prev) => ({ ...prev, status: event.target.value }))}><option value="">All Status</option><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option></select>
                <select value={complaintFilter.complaint_type} onChange={(event) => setComplaintFilter((prev) => ({ ...prev, complaint_type: event.target.value }))}><option value="">All Types</option><option value="Room">Room</option><option value="Mess">Mess</option><option value="Water">Water</option><option value="Electricity">Electricity</option><option value="Security">Security</option><option value="Other">Other</option></select>
                <button className="btn btn-outline" type="submit" disabled={busy}>Filter</button>
              </form>
              <div className="cards">
                {complaints.map((entry) => (
                  <article className="complaint-card" key={entry._id}>
                    <header><h4>{entry.complaint_type}</h4><span className={`status-badge ${entry.status.replace(" ", "-").toLowerCase()}`}>{entry.status}</span></header>
                    <p>{entry.description}</p>
                    <small>{`Student: ${entry.student_id?.name || "-"}`}</small>
                    <small>{`Assigned: ${entry.assigned_to?.name || "-"}`}</small>
                    {isAdmin ? (
                      <form className="stack-form compact" onSubmit={(event) => editComplaint(event, entry._id, true)}>
                        <select name="status" defaultValue={entry.status}><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option></select>
                        <select name="assigned_to" defaultValue={entry.assigned_to?._id || ""}><option value="">No Assignee</option>{staff.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select>
                        <textarea name="resolution_note" defaultValue={entry.resolution_note || ""} placeholder="Resolution note" />
                        <button className="btn btn-outline" type="submit" disabled={busy}>Save</button>
                      </form>
                    ) : (
                      entry.status === "Pending" && (
                        <form className="stack-form compact" onSubmit={(event) => editComplaint(event, entry._id, false)}>
                          <select name="complaint_type" defaultValue={entry.complaint_type}><option value="Room">Room</option><option value="Mess">Mess</option><option value="Water">Water</option><option value="Electricity">Electricity</option><option value="Security">Security</option><option value="Other">Other</option></select>
                          <textarea name="description" defaultValue={entry.description} />
                          <button className="btn btn-outline" type="submit" disabled={busy}>Update</button>
                        </form>
                      )
                    )}
                    {(isAdmin || entry.status === "Pending") && <button className="btn-link danger" type="button" onClick={() => deleteComplaint(entry._id)}>Delete</button>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "leaves" && (
          <section className="view-grid">
            {!isAdmin && (
              <div className="panel">
                <h3>Request Leave</h3>
                <form className="stack-form" onSubmit={createLeave}>
                  <input name="from_date" type="date" defaultValue={todayInput()} required />
                  <input name="to_date" type="date" defaultValue={todayInput()} required />
                  <textarea name="reason" placeholder="Write reason for leave..." required />
                  <button className="btn btn-primary" type="submit" disabled={busy}>Submit Leave Request</button>
                </form>
              </div>
            )}
            <div className="panel">
              <h3>Leave Board</h3>
              <form className="row-form" onSubmit={async (event) => { event.preventDefault(); await loadLeaves(leaveFilter); }}>
                <select value={leaveFilter.status} onChange={(event) => setLeaveFilter((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                {isAdmin ? (
                  <select value={leaveFilter.student_id} onChange={(event) => setLeaveFilter((prev) => ({ ...prev, student_id: event.target.value }))}>
                    <option value="">All Students</option>
                    {students.map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}
                  </select>
                ) : (
                  <input value={user.name} disabled />
                )}
                <button className="btn btn-outline" type="submit" disabled={busy}>Filter</button>
              </form>
              <div className="cards">
                {leaves.map((entry) => (
                  <article className="leave-card" key={entry._id}>
                    <header>
                      <h4>{`${formatDate(entry.from_date)} to ${formatDate(entry.to_date)}`}</h4>
                      <span className={`status-badge ${entry.status.toLowerCase()}`}>{entry.status}</span>
                    </header>
                    <p>{entry.reason}</p>
                    <small>{`Student: ${entry.student_id?.name || "-"}`}</small>
                    <small>{`Reviewed by: ${entry.reviewed_by?.name || "-"}`}</small>
                    <small>{`Review note: ${entry.review_note || "-"}`}</small>
                    {isAdmin ? (
                      <form className="stack-form compact" onSubmit={(event) => reviewLeave(event, entry._id)}>
                        <select name="status" defaultValue={entry.status}>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <textarea name="review_note" defaultValue={entry.review_note || ""} placeholder="Review note" />
                        <button className="btn btn-outline" type="submit" disabled={busy}>Save Review</button>
                      </form>
                    ) : (
                      entry.status === "Pending" && (
                        <form className="stack-form compact" onSubmit={(event) => updateLeaveAsStudent(event, entry._id)}>
                          <input name="from_date" type="date" defaultValue={toInputDate(entry.from_date)} required />
                          <input name="to_date" type="date" defaultValue={toInputDate(entry.to_date)} required />
                          <textarea name="reason" defaultValue={entry.reason} required />
                          <button className="btn btn-outline" type="submit" disabled={busy}>Update Request</button>
                        </form>
                      )
                    )}
                    {(isAdmin || entry.status === "Pending") && <button className="btn-link danger" type="button" onClick={() => deleteLeave(entry._id)}>Delete</button>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "notices" && (
          <section className="view-grid">
            {isAdmin && (
              <div className="panel">
                <h3>Publish Notice</h3>
                <form className="stack-form" onSubmit={createNotice}>
                  <input name="title" placeholder="Notice title" required />
                  <textarea name="body" placeholder="Notice details..." required />
                  <select name="priority" defaultValue="Normal">
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                  <select name="target_role" defaultValue="All">
                    <option value="All">All</option>
                    <option value="Student">Student</option>
                    <option value="Warden">Warden</option>
                  </select>
                  <input name="publish_date" type="date" defaultValue={todayInput()} />
                  <input name="expires_at" type="date" />
                  <button className="btn btn-primary" type="submit" disabled={busy}>Publish</button>
                </form>
              </div>
            )}
            <div className="panel">
              <h3>Notice Board</h3>
              <form className={`row-form ${!isAdmin ? "notice-filter-student" : ""}`} onSubmit={async (event) => { event.preventDefault(); await loadNotices(noticeFilter); }}>
                <select value={noticeFilter.priority} onChange={(event) => setNoticeFilter((prev) => ({ ...prev, priority: event.target.value }))}>
                  <option value="">All Priority</option>
                  <option value="Normal">Normal</option>
                  <option value="Important">Important</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <select value={noticeFilter.target_role} onChange={(event) => setNoticeFilter((prev) => ({ ...prev, target_role: event.target.value }))}>
                  <option value="">All Targets</option>
                  <option value="All">All</option>
                  <option value="Student">Student</option>
                  <option value="Warden">Warden</option>
                </select>
                {isAdmin ? (
                  <select value={noticeFilter.active} onChange={(event) => setNoticeFilter((prev) => ({ ...prev, active: event.target.value }))}>
                    <option value="">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                ) : (
                  <button className="btn btn-outline" type="submit" disabled={busy}>Filter</button>
                )}
                {isAdmin && <button className="btn btn-outline" type="submit" disabled={busy}>Filter</button>}
              </form>
              <div className="cards">
                {notices.map((entry) => (
                  <article className="notice-card" key={entry._id}>
                    <header>
                      <h4>{entry.title}</h4>
                      <span className={`priority-badge ${entry.priority.toLowerCase()}`}>{entry.priority}</span>
                    </header>
                    <p>{entry.body}</p>
                    <small>{`Target: ${entry.target_role}`}</small>
                    <small>{`Published: ${formatDate(entry.publish_date)} | Expires: ${formatDate(entry.expires_at)}`}</small>
                    <small>{`Status: ${entry.is_active ? "Active" : "Inactive"}`}</small>
                    {isAdmin && (
                      <form className="stack-form compact" onSubmit={(event) => updateNotice(event, entry._id)}>
                        <input name="title" defaultValue={entry.title} required />
                        <textarea name="body" defaultValue={entry.body} required />
                        <select name="priority" defaultValue={entry.priority}>
                          <option value="Normal">Normal</option>
                          <option value="Important">Important</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                        <select name="target_role" defaultValue={entry.target_role}>
                          <option value="All">All</option>
                          <option value="Student">Student</option>
                          <option value="Warden">Warden</option>
                        </select>
                        <input name="publish_date" type="date" defaultValue={toInputDate(entry.publish_date)} />
                        <input name="expires_at" type="date" defaultValue={toInputDate(entry.expires_at)} />
                        <select name="is_active" defaultValue={`${entry.is_active}`}>
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                        <button className="btn btn-outline" type="submit" disabled={busy}>Save Notice</button>
                      </form>
                    )}
                    {isAdmin && <button className="btn-link danger" type="button" onClick={() => deleteNotice(entry._id)}>Delete</button>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {toast.open && <Toast toast={toast} />}
    </div>
  );
}

function Toast({ toast }) {
  return <div className={`toast ${toast.type}`}>{toast.text}</div>;
}

export default App;
