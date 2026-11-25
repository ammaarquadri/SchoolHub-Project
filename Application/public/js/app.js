// SchoolHub frontend - plain JavaScript, no libraries.
// Pages: dashboard, students, teachers, classes, attendance, demo data.

/* ============ Icons ============ */
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cap: '<path d="M2 8l10-5 10 5-10 5z"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
  teacher: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l2 2 4-4"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  xcircle: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>',
  ok: '<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>',
};
const icon = (name, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/* ============ Helpers ============ */
const $ = (sel) => document.querySelector(sel);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const pad = (n) => String(n).padStart(2, "0");
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const prettyDate = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortDay = (s) => new Date(s + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });

async function api(path, options = {}) {
  let res;
  try {
    res = await fetch("/api/" + path, {
      method: options.method || "GET",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status}).`);
  return data;
}

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = "toast" + (type === "error" ? " error" : "");
  el.textContent = message;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

/* ============ Modals ============ */
function openModal(title, bodyHTML, footHTML = "", wide = false) {
  $("#modal-root").innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head"><h2>${esc(title)}</h2>
          <button class="icon-btn" id="modal-x" aria-label="Close">${icon("x")}</button></div>
        <div class="modal-body">${bodyHTML}</div>
        <div class="modal-foot">${footHTML}</div>
      </div>
    </div>`;
  $("#modal-x").onclick = closeModal;
  $("#modal-backdrop").addEventListener("mousedown", (e) => { if (e.target.id === "modal-backdrop") closeModal(); });
}
function closeModal() { $("#modal-root").innerHTML = ""; }
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// Generic add/edit form. fields: [{name,label,type,required,options,placeholder}]
function formModal({ title, fields, values = {}, submitLabel, onSubmit }) {
  const body = fields.map((f) => {
    const val = values[f.name] ?? "";
    const label = `<label for="f-${f.name}">${esc(f.label)}${f.required ? " <i>*</i>" : ""}</label>`;
    let control;
    if (f.type === "select") {
      const opts = [`<option value="">${esc(f.placeholder || "Select...")}</option>`]
        .concat(f.options.map((o) => `<option value="${esc(o.value)}" ${o.value === val ? "selected" : ""}>${esc(o.label)}</option>`));
      control = `<select class="input" id="f-${f.name}" name="${f.name}">${opts.join("")}</select>`;
    } else {
      control = `<input class="input" id="f-${f.name}" name="${f.name}" type="${f.type || "text"}" value="${esc(val)}" placeholder="${esc(f.placeholder || "")}" autocomplete="off">`;
    }
    return `<div class="field">${label}${control}<span class="field-error" data-err="${f.name}"></span></div>`;
  }).join("");

  openModal(title, `<div id="form-error"></div><form id="modal-form" novalidate>${body}</form>`,
    `<button class="btn ghost" type="button" id="m-cancel">Cancel</button>
     <button class="btn" type="submit" form="modal-form" id="m-save">${esc(submitLabel)}</button>`);
  $("#m-cancel").onclick = closeModal;
  const first = $("#modal-form input, #modal-form select");
  if (first) first.focus();

  $("#modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    let valid = true;
    for (const f of fields) {
      const bad = f.required && !String(data[f.name] || "").trim();
      $(`[data-err="${f.name}"]`).textContent = bad ? `${f.label} is required.` : "";
      $(`#f-${f.name}`).classList.toggle("invalid", bad);
      if (bad) valid = false;
    }
    if (!valid) return;
    const btn = $("#m-save");
    btn.disabled = true;
    $("#form-error").innerHTML = "";
    try {
      await onSubmit(data);
      closeModal();
      await render();
    } catch (err) {
      $("#form-error").innerHTML = `<div class="form-error">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

function confirmModal(title, message, confirmLabel, onConfirm) {
  openModal(title, `<p>${message}</p><div id="form-error"></div>`,
    `<button class="btn ghost" id="c-cancel">Cancel</button><button class="btn danger" id="c-ok">${esc(confirmLabel)}</button>`);
  $("#c-cancel").onclick = closeModal;
  $("#c-ok").onclick = async () => {
    $("#c-ok").disabled = true;
    try { await onConfirm(); closeModal(); await render(); }
    catch (err) { $("#form-error").innerHTML = `<div class="form-error">${esc(err.message)}</div>`; $("#c-ok").disabled = false; }
  };
}

/* ============ Shared view pieces ============ */
function emptyState(iconName, title, text, buttonsHTML = "") {
  return `<div class="empty"><div class="empty-icon">${icon(iconName, 30)}</div>
    <h3>${esc(title)}</h3><p>${esc(text)}</p><div class="row">${buttonsHTML}</div></div>`;
}
const sampleBadge = (x) => (x.sample ? '<span class="badge sample">Sample</span>' : "");
const actionButtons = (kind, id) => `
  <button class="icon-btn" data-edit="${kind}:${id}" aria-label="Edit">${icon("edit", 18)}</button>
  <button class="icon-btn del" data-del="${kind}:${id}" aria-label="Delete">${icon("trash", 18)}</button>`;

async function seedDemo() {
  await api("seed", { method: "POST", body: { today: localDate() } });
  toast("Sample data loaded.");
  location.hash = "#/dashboard";
  await render();
}
const seedBtn = '<button class="btn" data-action="seed">Load sample data</button>';

/* ============ Pages ============ */
const pages = {
  dashboard: { title: "Dashboard", icon: "grid", render: renderDashboard },
  students: { title: "Students", icon: "cap", render: renderStudents },
  teachers: { title: "Teachers", icon: "teacher", render: renderTeachers },
  classes: { title: "Classes", icon: "book", render: renderClasses },
  attendance: { title: "Attendance", icon: "check", render: renderAttendance },
  demo: { title: "Demo Data", icon: "db", render: renderDemo },
};

/* ---------- Dashboard ---------- */
async function renderDashboard(view) {
  const d = await api("dashboard?date=" + localDate());
  const { totals, today, week } = d;
  const marked = today.present + today.absent;
  const presentPct = marked ? Math.round((today.present / marked) * 100) : 0;
  const total = Math.max(today.present + today.absent + today.notMarked, 1);
  const a = (today.present / total) * 100;
  const b = a + (today.absent / total) * 100;
  const donut = `conic-gradient(var(--green) 0 ${a}%, var(--red) ${a}% ${b}%, #dfe3f5 ${b}% 100%)`;

  const bars = week.map((w) => {
    const n = w.present + w.absent;
    const pct = n ? Math.round((w.present / n) * 100) : 0;
    return `<div class="bar-col"><em>${n ? pct + "%" : "-"}</em>
      <div class="bar-track" title="${prettyDate(w.date)}: ${w.present} present, ${w.absent} absent">
        <div class="bar-fill" style="height:${pct}%"></div></div><small>${shortDay(w.date)}</small></div>`;
  }).join("");

  const empty = totals.students + totals.teachers + totals.classes === 0;
  view.onclick = handleActions;
  view.innerHTML = `
    <section class="hero">
      <div><h2>Welcome to SchoolHub</h2>
        <p>${prettyDate(today.date)}. ${empty ? "Your school is empty. Add classes or load sample data to get started."
          : `${today.classesMarked} of ${totals.classes} classes have attendance marked today.`}</p></div>
      <div class="actions">
        <a class="btn white" href="#/attendance">${icon("check", 18)} Mark attendance</a>
        <a class="btn light" href="#/students">${icon("plus", 18)} Add student</a>
        ${empty ? '<button class="btn light" data-action="seed">Load sample data</button>' : ""}
      </div>
    </section>

    <section class="stats">
      <div class="card stat"><div class="stat-icon blue">${icon("cap", 24)}</div><div><strong>${totals.students}</strong><span>Total students</span></div></div>
      <div class="card stat"><div class="stat-icon purple">${icon("teacher", 24)}</div><div><strong>${totals.teachers}</strong><span>Total teachers</span></div></div>
      <div class="card stat"><div class="stat-icon amber">${icon("book", 24)}</div><div><strong>${totals.classes}</strong><span>Total classes</span></div></div>
      <div class="card stat"><div class="stat-icon green">${icon("ok", 24)}</div><div><strong>${today.present}</strong><span>Present today</span></div></div>
      <div class="card stat"><div class="stat-icon red">${icon("xcircle", 24)}</div><div><strong>${today.absent}</strong><span>Absent today</span></div></div>
    </section>

    <section class="two-col">
      <div class="card">
        <div class="card-head"><h2>Today's attendance</h2></div>
        <div class="donut-wrap">
          <div class="donut" style="background:${donut}"><div class="donut-hole"><div><strong>${presentPct}%</strong><span>present</span></div></div></div>
          <div class="legend">
            <div><i style="background:var(--green)"></i>Present <b>${today.present}</b></div>
            <div><i style="background:var(--red)"></i>Absent <b>${today.absent}</b></div>
            <div><i style="background:#dfe3f5"></i>Not marked <b>${today.notMarked}</b></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Last 7 days</h2><span class="sub">Share of students present</span></div>
        <div class="bars">${bars}</div>
      </div>
    </section>`;
}

/* ---------- Students ---------- */
async function renderStudents(view) {
  const [students, classes] = await Promise.all([api("students"), api("classes")]);
  const className = (id) => (classes.find((c) => c.id === id) || {}).name || "No class";
  students.sort((a, b) => a.name.localeCompare(b.name));

  view.innerHTML = `
    <div class="toolbar">
      <div class="search">${icon("search", 18)}<input class="input" id="search" placeholder="Search by name, admission no, class or parent" aria-label="Search students"></div>
      <button class="btn spacer" id="add-btn">${icon("plus", 18)} Add student</button>
    </div>
    <div class="card table-card" id="table-box"></div>`;

  const draw = () => {
    const q = $("#search").value.trim().toLowerCase();
    const rows = students.filter((s) =>
      [s.name, s.admissionNo, className(s.classId), s.parentName, s.contact].join(" ").toLowerCase().includes(q));
    const box = $("#table-box");
    if (students.length === 0) {
      box.innerHTML = emptyState("cap", "No students yet",
        classes.length ? "Add your first student, or load sample data to see how SchoolHub looks."
          : "Create a class first, then add students to it. Or load sample data.",
        `<button class="btn" id="empty-add">${classes.length ? "Add student" : "Create a class"}</button>${seedBtn}`);
      $("#empty-add").onclick = () => (classes.length ? addStudent() : (location.hash = "#/classes"));
      return;
    }
    if (rows.length === 0) { box.innerHTML = emptyState("search", "No matching students", `Nothing matches "${$("#search").value}". Try a different search.`); return; }
    box.innerHTML = `<div class="table-scroll"><table><thead><tr>
      <th>Student</th><th>Admission no</th><th>Class</th><th>Parent</th><th>Contact</th><th class="actions">Actions</th></tr></thead><tbody>
      ${rows.map((s) => `<tr>
        <td><div class="person"><span class="mini-avatar">${esc(initials(s.name))}</span><span>${esc(s.name)}${sampleBadge(s)}</span></div></td>
        <td>${esc(s.admissionNo)}</td>
        <td><span class="badge">${esc(className(s.classId))}</span></td>
        <td>${esc(s.parentName) || '<span class="muted">-</span>'}</td>
        <td>${esc(s.contact) || '<span class="muted">-</span>'}</td>
        <td class="actions">${actionButtons("student", s.id)}</td></tr>`).join("")}
      </tbody></table></div>`;
  };

  const fields = () => [
    { name: "name", label: "Student name", required: true, placeholder: "e.g. Aarav Sharma" },
    { name: "admissionNo", label: "Admission number", required: true, placeholder: "e.g. SH3001" },
    { name: "classId", label: "Class", type: "select", required: true, placeholder: "Choose a class", options: classes.map((c) => ({ value: c.id, label: c.name })) },
    { name: "parentName", label: "Parent name", placeholder: "Parent or guardian" },
    { name: "contact", label: "Contact number", type: "tel", placeholder: "e.g. 9876543210" },
  ];
  function addStudent() {
    if (!classes.length) { toast("Create a class first.", "error"); location.hash = "#/classes"; return; }
    formModal({ title: "Add student", fields: fields(), submitLabel: "Add student",
      onSubmit: async (data) => { await api("students", { method: "POST", body: data }); toast("Student added."); } });
  }
  $("#add-btn").onclick = addStudent;
  $("#search").addEventListener("input", draw);
  draw();

  view.onclick = (e) => {
    const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
    if (edit) {
      const s = students.find((x) => x.id === edit.dataset.edit.split(":")[1]);
      formModal({ title: "Edit student", fields: fields(), values: s, submitLabel: "Save changes",
        onSubmit: async (data) => { await api("students/" + s.id, { method: "PUT", body: data }); toast("Student updated."); } });
    }
    if (del) {
      const s = students.find((x) => x.id === del.dataset.del.split(":")[1]);
      confirmModal("Delete student", `Delete <strong>${esc(s.name)}</strong>? This cannot be undone.`, "Delete student",
        async () => { await api("students/" + s.id, { method: "DELETE" }); toast("Student deleted."); });
    }
    handleActions(e);
  };
}

/* ---------- Teachers ---------- */
async function renderTeachers(view) {
  const [teachers, classes] = await Promise.all([api("teachers"), api("classes")]);
  teachers.sort((a, b) => a.name.localeCompare(b.name));
  view.innerHTML = `
    <div class="toolbar"><button class="btn spacer" id="add-btn">${icon("plus", 18)} Add teacher</button></div>
    <div class="card table-card" id="table-box"></div>`;

  const fields = [
    { name: "name", label: "Teacher name", required: true, placeholder: "e.g. Priya Nair" },
    { name: "subject", label: "Subject", required: true, placeholder: "e.g. Mathematics" },
    { name: "contact", label: "Contact number", type: "tel", placeholder: "e.g. 9876543210" },
  ];
  const add = () => formModal({ title: "Add teacher", fields, submitLabel: "Add teacher",
    onSubmit: async (data) => { await api("teachers", { method: "POST", body: data }); toast("Teacher added."); } });
  $("#add-btn").onclick = add;

  const box = $("#table-box");
  if (!teachers.length) {
    box.innerHTML = emptyState("teacher", "No teachers yet", "Add a teacher, then assign them to a class.", `<button class="btn" id="empty-add">Add teacher</button>${seedBtn}`);
    $("#empty-add").onclick = add;
  } else {
    box.innerHTML = `<div class="table-scroll"><table><thead><tr>
      <th>Teacher</th><th>Subject</th><th>Contact</th><th>Class teacher of</th><th class="actions">Actions</th></tr></thead><tbody>
      ${teachers.map((t) => {
        const mine = classes.filter((c) => c.teacherId === t.id).map((c) => c.name);
        return `<tr><td><div class="person"><span class="mini-avatar">${esc(initials(t.name))}</span><span>${esc(t.name)}${sampleBadge(t)}</span></div></td>
          <td><span class="badge">${esc(t.subject)}</span></td>
          <td>${esc(t.contact) || '<span class="muted">-</span>'}</td>
          <td>${mine.length ? esc(mine.join(", ")) : '<span class="muted">Not assigned</span>'}</td>
          <td class="actions">${actionButtons("teacher", t.id)}</td></tr>`;
      }).join("")}</tbody></table></div>`;
  }

  view.onclick = (e) => {
    const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
    if (edit) {
      const t = teachers.find((x) => x.id === edit.dataset.edit.split(":")[1]);
      formModal({ title: "Edit teacher", fields, values: t, submitLabel: "Save changes",
        onSubmit: async (data) => { await api("teachers/" + t.id, { method: "PUT", body: data }); toast("Teacher updated."); } });
    }
    if (del) {
      const t = teachers.find((x) => x.id === del.dataset.del.split(":")[1]);
      confirmModal("Delete teacher", `Delete <strong>${esc(t.name)}</strong>? Any class they teach will become unassigned.`, "Delete teacher",
        async () => { await api("teachers/" + t.id, { method: "DELETE" }); toast("Teacher deleted."); });
    }
    handleActions(e);
  };
}

/* ---------- Classes ---------- */
async function renderClasses(view) {
  const [classes, teachers, students] = await Promise.all([api("classes"), api("teachers"), api("students")]);
  classes.sort((a, b) => a.name.localeCompare(b.name));
  const teacherName = (id) => (teachers.find((t) => t.id === id) || {}).name;
  view.innerHTML = `
    <div class="toolbar"><button class="btn spacer" id="add-btn">${icon("plus", 18)} Add class</button></div>
    <div class="card table-card" id="table-box"></div>`;

  const fields = () => [
    { name: "name", label: "Class name", required: true, placeholder: "e.g. Grade 5-A" },
    { name: "teacherId", label: "Class teacher", type: "select", placeholder: "No teacher assigned", options: teachers.map((t) => ({ value: t.id, label: `${t.name} (${t.subject})` })) },
  ];
  const add = () => formModal({ title: "Add class", fields: fields(), submitLabel: "Add class",
    onSubmit: async (data) => { await api("classes", { method: "POST", body: data }); toast("Class added."); } });
  $("#add-btn").onclick = add;

  const box = $("#table-box");
  if (!classes.length) {
    box.innerHTML = emptyState("book", "No classes yet", "Create a class, then add students to it.", `<button class="btn" id="empty-add">Add class</button>${seedBtn}`);
    $("#empty-add").onclick = add;
  } else {
    box.innerHTML = `<div class="table-scroll"><table><thead><tr>
      <th>Class</th><th>Class teacher</th><th>Students</th><th class="actions">Actions</th></tr></thead><tbody>
      ${classes.map((c) => `<tr><td><strong>${esc(c.name)}</strong>${sampleBadge(c)}</td>
        <td>${teacherName(c.teacherId) ? esc(teacherName(c.teacherId)) : '<span class="muted">Not assigned</span>'}</td>
        <td><span class="badge">${students.filter((s) => s.classId === c.id).length}</span></td>
        <td class="actions">${actionButtons("class", c.id)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  view.onclick = (e) => {
    const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
    if (edit) {
      const c = classes.find((x) => x.id === edit.dataset.edit.split(":")[1]);
      formModal({ title: "Edit class", fields: fields(), values: c, submitLabel: "Save changes",
        onSubmit: async (data) => { await api("classes/" + c.id, { method: "PUT", body: data }); toast("Class updated."); } });
    }
    if (del) {
      const c = classes.find((x) => x.id === del.dataset.del.split(":")[1]);
      confirmModal("Delete class", `Delete <strong>${esc(c.name)}</strong>? Its students will stay but have no class.`, "Delete class",
        async () => { await api("classes/" + c.id, { method: "DELETE" }); toast("Class deleted."); });
    }
    handleActions(e);
  };
}

/* ---------- Attendance ---------- */
async function renderAttendance(view) {
  const [classes, students, history] = await Promise.all([api("classes"), api("students"), api("attendance/history")]);
  classes.sort((a, b) => a.name.localeCompare(b.name));

  if (!classes.length) {
    view.innerHTML = `<div class="card">${emptyState("check", "No classes to mark", "Create a class and add students first, or load sample data.",
      `<a class="btn" href="#/classes">Go to classes</a>${seedBtn}`)}</div>`;
    view.onclick = handleActions;
    return;
  }

  view.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-head"><h2>Mark attendance</h2></div>
      <div class="att-controls">
        <div class="field"><label for="att-class">Class</label>
          <select class="input" id="att-class">${classes.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="att-date">Date</label>
          <input class="input" id="att-date" type="date" value="${localDate()}" max="${localDate()}"></div>
      </div>
      <div id="att-box"></div>
    </div>
    <div class="card table-card">
      <div style="padding:20px 22px 4px"><div class="card-head" style="margin:0"><h2>Saved records</h2></div></div>
      <div id="history-box"></div>
    </div>`;

  /* Mark section */
  let statuses = {}; // studentId -> "present" | "absent"
  let current = [];
  const drawList = () => {
    const present = current.filter((s) => statuses[s.id] === "present").length;
    $("#att-box").innerHTML = `
      <div class="att-summary">
        <span class="badge green">Present: ${present}</span><span class="badge red">Absent: ${current.length - present}</span>
        <button class="btn ghost" id="all-present" style="margin-left:auto">Mark all present</button>
      </div>
      ${current.map((s) => `<div class="att-row">
        <div class="person"><span class="mini-avatar">${esc(initials(s.name))}</span><span>${esc(s.name)}<small>${esc(s.admissionNo)}</small></span></div>
        <div class="seg">
          <button data-status="present:${s.id}" class="${statuses[s.id] === "present" ? "on-present" : ""}">Present</button>
          <button data-status="absent:${s.id}" class="${statuses[s.id] === "absent" ? "on-absent" : ""}">Absent</button>
        </div></div>`).join("")}
      <div style="margin-top:18px;display:flex;justify-content:flex-end"><button class="btn" id="save-att">Save attendance</button></div>`;
  };
  const loadClass = async () => {
    const classId = $("#att-class").value, date = $("#att-date").value;
    current = students.filter((s) => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name));
    if (!date) { $("#att-box").innerHTML = ""; return; }
    if (!current.length) {
      $("#att-box").innerHTML = emptyState("cap", "No students in this class", "Add students to this class before marking attendance.", '<a class="btn" href="#/students">Go to students</a>');
      return;
    }
    $("#att-box").innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
    let saved = null;
    try { saved = await api(`attendance?date=${date}&classId=${classId}`); }
    catch (err) { toast(err.message, "error"); }
    statuses = {};
    current.forEach((s) => { statuses[s.id] = "present"; });
    if (saved) saved.records.forEach((r) => { if (statuses[r.studentId] !== undefined) statuses[r.studentId] = r.status; });
    drawList();
    if (saved) toast("Showing saved attendance for this date.");
  };
  $("#att-class").onchange = loadClass;
  $("#att-date").onchange = loadClass;

  view.onclick = async (e) => {
    const st = e.target.closest("[data-status]");
    if (st) { const [status, id] = st.dataset.status.split(":"); statuses[id] = status; drawList(); return; }
    if (e.target.closest("#all-present")) { current.forEach((s) => { statuses[s.id] = "present"; }); drawList(); return; }
    if (e.target.closest("#save-att")) {
      const btn = $("#save-att"); btn.disabled = true;
      try {
        await api("attendance", { method: "POST", body: {
          date: $("#att-date").value, classId: $("#att-class").value,
          records: current.map((s) => ({ studentId: s.id, status: statuses[s.id] })) } });
        toast("Attendance saved.");
        await renderHistory();
      } catch (err) { toast(err.message, "error"); }
      btn.disabled = false;
      return;
    }
    const v = e.target.closest("[data-view]");
    if (v) {
      const [date, classId] = v.dataset.view.split("|");
      try {
        const rec = await api(`attendance?date=${date}&classId=${classId}`);
        if (!rec) { toast("Record not found.", "error"); return; }
        openModal(`${rec.className} - ${prettyDate(rec.date)}`,
          `<div class="table-scroll"><table style="min-width:0"><thead><tr><th>Student</th><th>Admission no</th><th>Status</th></tr></thead><tbody>
          ${rec.records.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.admissionNo)}</td>
            <td><span class="badge ${r.status === "present" ? "green" : "red"}">${r.status === "present" ? "Present" : "Absent"}</span></td></tr>`).join("")}
          </tbody></table></div>`, '<button class="btn ghost" id="v-close">Close</button>', true);
        $("#v-close").onclick = closeModal;
      } catch (err) { toast(err.message, "error"); }
      return;
    }
    handleActions(e);
  };

  /* History section */
  async function renderHistory() {
    const rows = await api("attendance/history");
    const box = $("#history-box");
    if (!rows.length) { box.innerHTML = emptyState("check", "No saved records yet", "Saved attendance will appear here."); return; }
    box.innerHTML = `<div class="table-scroll"><table><thead><tr><th>Date</th><th>Class</th><th>Present</th><th>Absent</th><th class="actions">View</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(prettyDate(r.date))}</td><td>${esc(r.className)}</td>
        <td><span class="badge green">${r.present}</span></td><td><span class="badge red">${r.absent}</span></td>
        <td class="actions"><button class="icon-btn" data-view="${r.date}|${r.classId}" aria-label="View record">${icon("eye", 18)}</button></td></tr>`).join("")}
      </tbody></table></div>`;
  }
  const first = history;
  if (!first.length) $("#history-box").innerHTML = emptyState("check", "No saved records yet", "Saved attendance will appear here.");
  else await renderHistory();
  await loadClass();
}

/* ---------- Demo data ---------- */
async function renderDemo(view) {
  view.innerHTML = `
    <div class="card" style="max-width:720px">
      <div class="card-head"><h2>Demo data</h2></div>
      <p class="sub" style="margin-bottom:18px">Load a small set of clearly marked sample records (3 classes, 3 teachers, 12 students and five days of attendance),
        or remove everything you have entered. Clearing deletes all students, teachers, classes and attendance records.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn" data-action="seed">Load sample data</button>
        <button class="btn danger" data-action="clear">Clear all data</button>
      </div>
      <p class="sub" style="margin-top:20px">SchoolHub is a demonstration project. Do not store real children's personal information in it.</p>
    </div>`;
  view.onclick = handleActions;
}

// Buttons shared across pages: data-action="seed" / "clear"
function handleActions(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  if (btn.dataset.action === "seed") {
    btn.disabled = true;
    seedDemo().catch((err) => { toast(err.message, "error"); btn.disabled = false; });
  }
  if (btn.dataset.action === "clear") {
    confirmModal("Clear all data", "This permanently deletes every student, teacher, class and attendance record.", "Clear all data",
      async () => { await api("clear", { method: "POST" }); toast("All data cleared."); });
  }
}

/* ============ Router & shell ============ */
async function render() {
  const key = (location.hash.replace(/^#\/?/, "") || "dashboard").split("?")[0];
  const page = pages[key] || pages.dashboard;
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.page === (pages[key] ? key : "dashboard")));
  $("#page-title").textContent = page.title;
  document.title = `${page.title} - SchoolHub`;
  const view = $("#view");
  view.onclick = null;
  view.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  try {
    await page.render(view);
  } catch (err) {
    view.innerHTML = `<div class="card">${emptyState("xcircle", "Something went wrong", err.message, '<button class="btn" id="retry">Try again</button>')}</div>`;
    $("#retry").onclick = render;
  }
}

function closeMenu() { $("#sidebar").classList.remove("open"); $("#overlay").classList.remove("show"); }

function init() {
  $("#brand-mark").innerHTML = icon("cap", 24);
  $("#menu-btn").innerHTML = icon("menu", 22);
  $("#today-label").textContent = prettyDate(localDate());
  $("#nav").innerHTML = Object.entries(pages)
    .map(([key, p]) => `<a href="#/${key}" data-page="${key}">${icon(p.icon, 20)}<span>${p.title}</span></a>`).join("");
  $("#menu-btn").onclick = () => { $("#sidebar").classList.add("open"); $("#overlay").classList.add("show"); };
  $("#overlay").onclick = closeMenu;
  $("#nav").addEventListener("click", closeMenu);
  window.addEventListener("hashchange", () => { closeModal(); render(); });
  render();
}
init();
