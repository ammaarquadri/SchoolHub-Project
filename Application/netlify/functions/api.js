// SchoolHub API - one small Netlify Function that handles every /api/* route.
// Data is stored in Netlify Blobs (a simple key-value store).
//
// Blob keys:
//   students, teachers, classes        -> JSON arrays
//   attendance/<YYYY-MM-DD>/<classId>  -> one saved attendance record

import { getStore } from "@netlify/blobs";

export const config = { path: "/api/*" };

const db = () => getStore({ name: "schoolhub", consistency: "strong" });
const send = (data, status = 200) => Response.json(data, { status });
const fail = (message, status = 400) => send({ error: message }, status);
const clean = (v) => (typeof v === "string" ? v.trim() : "");
const phoneOk = (v) => !v || /^[0-9+\-\s()]{6,20}$/.test(v);
const dateOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");

async function load(name) {
  return (await db().get(name, { type: "json" })) || [];
}
async function save(name, list) {
  await db().setJSON(name, list);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
async function readPrefix(prefix) {
  const { blobs } = await db().list({ prefix });
  const items = await Promise.all(blobs.map((b) => db().get(b.key, { type: "json" })));
  return items.filter(Boolean);
}

// ---------- Validation rules for the three simple collections ----------

const rules = {
  students: {
    fields: ["name", "admissionNo", "classId", "parentName", "contact"],
    async check(item, list, id) {
      if (!item.name) return "Student name is required.";
      if (!item.admissionNo) return "Admission number is required.";
      if (!item.classId) return "Please choose a class.";
      if (!phoneOk(item.contact)) return "Contact number looks invalid.";
      const classes = await load("classes");
      if (!classes.some((c) => c.id === item.classId)) return "Selected class does not exist.";
      const dup = list.some(
        (s) => s.id !== id && s.admissionNo.toLowerCase() === item.admissionNo.toLowerCase()
      );
      if (dup) return `Admission number "${item.admissionNo}" is already used.`;
      return null;
    },
  },
  teachers: {
    fields: ["name", "subject", "contact"],
    async check(item) {
      if (!item.name) return "Teacher name is required.";
      if (!item.subject) return "Subject is required.";
      if (!phoneOk(item.contact)) return "Contact number looks invalid.";
      return null;
    },
  },
  classes: {
    fields: ["name", "teacherId"],
    async check(item, list, id) {
      if (!item.name) return "Class name is required.";
      if (list.some((c) => c.id !== id && c.name.toLowerCase() === item.name.toLowerCase()))
        return `A class named "${item.name}" already exists.`;
      if (item.teacherId) {
        const teachers = await load("teachers");
        if (!teachers.some((t) => t.id === item.teacherId)) return "Selected teacher does not exist.";
      }
      return null;
    },
  },
};

// Keep related data tidy after a delete.
async function afterDelete(kind, id) {
  if (kind === "teachers") {
    const classes = await load("classes");
    classes.forEach((c) => { if (c.teacherId === id) c.teacherId = ""; });
    await save("classes", classes);
  }
  if (kind === "classes") {
    const students = await load("students");
    students.forEach((s) => { if (s.classId === id) s.classId = ""; });
    await save("students", students);
  }
}

async function crud(kind, method, id, body) {
  const rule = rules[kind];
  const list = await load(kind);

  if (method === "GET") return send(list);

  if (method === "DELETE") {
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return fail("Record not found.", 404);
    list.splice(i, 1);
    await save(kind, list);
    await afterDelete(kind, id);
    return send({ ok: true });
  }

  if (method === "POST" || method === "PUT") {
    const item = {};
    for (const k of rule.fields) item[k] = clean(body[k]);
    const idx = method === "PUT" ? list.findIndex((x) => x.id === id) : -1;
    if (method === "PUT" && idx < 0) return fail("Record not found.", 404);
    const error = await rule.check(item, list, id);
    if (error) return fail(error);
    let saved;
    if (method === "POST") {
      saved = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      list.push(saved);
    } else {
      saved = { ...list[idx], ...item };
      list[idx] = saved;
    }
    await save(kind, list);
    return send(saved, method === "POST" ? 201 : 200);
  }
  return fail("Method not allowed.", 405);
}

// ---------- Attendance ----------

async function attendance(method, sub, url, body) {
  if (method === "GET" && sub === "history") {
    const records = await readPrefix("attendance/");
    const rows = records
      .map((r) => ({
        date: r.date,
        classId: r.classId,
        className: r.className,
        present: r.records.filter((x) => x.status === "present").length,
        absent: r.records.filter((x) => x.status === "absent").length,
        savedAt: r.savedAt,
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || a.className.localeCompare(b.className));
    return send(rows);
  }

  if (method === "GET") {
    const date = url.searchParams.get("date");
    const classId = url.searchParams.get("classId");
    if (!dateOk(date) || !classId) return fail("Date and class are required.");
    return send((await db().get(`attendance/${date}/${classId}`, { type: "json" })) || null);
  }

  if (method === "POST") {
    const { date, classId, records } = body;
    if (!dateOk(date)) return fail("Please choose a valid date.");
    const cls = (await load("classes")).find((c) => c.id === classId);
    if (!cls) return fail("Please choose a class.");
    if (!Array.isArray(records) || records.length === 0) return fail("There are no students to save.");
    const students = (await load("students")).filter((s) => s.classId === classId);
    const byId = new Map(students.map((s) => [s.id, s]));
    const rows = [];
    for (const r of records) {
      const s = byId.get(r.studentId);
      if (!s) continue;
      if (r.status !== "present" && r.status !== "absent") return fail("Each student must be Present or Absent.");
      rows.push({ studentId: s.id, name: s.name, admissionNo: s.admissionNo, status: r.status });
    }
    if (rows.length === 0) return fail("No valid students to save.");
    const record = { date, classId, className: cls.name, records: rows, savedAt: new Date().toISOString() };
    await db().setJSON(`attendance/${date}/${classId}`, record);
    return send(record);
  }
  return fail("Method not allowed.", 405);
}

// ---------- Dashboard ----------

async function dashboard(url) {
  const asked = url.searchParams.get("date");
  const today = dateOk(asked) ? asked : new Date().toISOString().slice(0, 10);
  const [students, teachers, classes] = await Promise.all([load("students"), load("teachers"), load("classes")]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const week = await Promise.all(
    days.map(async (date) => {
      const recs = await readPrefix(`attendance/${date}/`);
      let present = 0, absent = 0;
      recs.forEach((r) => r.records.forEach((x) => (x.status === "present" ? present++ : absent++)));
      return { date, present, absent, classesMarked: recs.length };
    })
  );
  const t = week[week.length - 1];
  return send({
    totals: { students: students.length, teachers: teachers.length, classes: classes.length },
    today: {
      date: today,
      present: t.present,
      absent: t.absent,
      notMarked: Math.max(students.length - t.present - t.absent, 0),
      classesMarked: t.classesMarked,
    },
    week,
  });
}

// ---------- Demo data ----------

async function seed(body) {
  const [s, t, c] = await Promise.all([load("students"), load("teachers"), load("classes")]);
  if (s.length || t.length || c.length) return fail("Data already exists. Clear it first to load the sample data.", 409);
  const today = dateOk(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const id = () => crypto.randomUUID();

  const teachers = [
    { name: "Priya Nair", subject: "Mathematics", contact: "9876500011" },
    { name: "Rahul Verma", subject: "Science", contact: "9876500022" },
    { name: "Fatima Khan", subject: "English", contact: "9876500033" },
  ].map((x) => ({ ...x, id: id(), createdAt: now, sample: true }));

  const classes = ["Grade 5-A", "Grade 6-B", "Grade 7-C"].map((name, i) => ({
    name, teacherId: teachers[i].id, id: id(), createdAt: now, sample: true,
  }));

  const names = [
    ["Aarav Sharma", "Neha Sharma"], ["Diya Patel", "Kiran Patel"], ["Vihaan Reddy", "Suresh Reddy"], ["Ananya Iyer", "Lakshmi Iyer"],
    ["Ishaan Gupta", "Rohit Gupta"], ["Meera Joshi", "Anil Joshi"], ["Zayan Ali", "Imran Ali"], ["Sara Fernandes", "Peter Fernandes"],
    ["Kabir Singh", "Harpreet Singh"], ["Riya Menon", "Gopal Menon"], ["Aditya Rao", "Sunita Rao"], ["Tara Das", "Bimal Das"],
  ];
  const students = names.map(([name, parentName], i) => ({
    name, parentName,
    admissionNo: `SH${2001 + i}`,
    classId: classes[Math.floor(i / 4)].id,
    contact: `98765${String(10000 + i * 137).slice(0, 5)}`,
    id: id(), createdAt: now, sample: true,
  }));

  await Promise.all([save("teachers", teachers), save("classes", classes), save("students", students)]);

  // Five days of sample attendance (deterministic, so no randomness needed).
  for (let k = 0; k < 5; k++) {
    const date = addDays(today, -k);
    for (const cls of classes) {
      const kids = students.filter((x) => x.classId === cls.id);
      const records = kids.map((x, i) => ({
        studentId: x.id, name: x.name, admissionNo: x.admissionNo,
        status: (i * 7 + k * 3 + cls.name.length) % 5 === 0 ? "absent" : "present",
      }));
      await db().setJSON(`attendance/${date}/${cls.id}`, {
        date, classId: cls.id, className: cls.name, records, savedAt: now, sample: true,
      });
    }
  }
  return send({ ok: true });
}

async function clearAll() {
  const store = db();
  const { blobs } = await store.list();
  await Promise.all(blobs.map((b) => store.delete(b.key)));
  return send({ ok: true, deleted: blobs.length });
}

// ---------- Router ----------

export default async (req) => {
  try {
    const url = new URL(req.url);
    const [resource, id] = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
    const method = req.method;
    const body = method === "POST" || method === "PUT" ? await req.json().catch(() => ({})) : {};

    if (rules[resource]) return await crud(resource, method, id, body);
    if (resource === "attendance") return await attendance(method, id, url, body);
    if (resource === "dashboard" && method === "GET") return await dashboard(url);
    if (resource === "seed" && method === "POST") return await seed(body);
    if (resource === "clear" && method === "POST") return await clearAll();
    return fail("Route not found.", 404);
  } catch (err) {
    console.error(err);
    return fail("Server error. Please try again.", 500);
  }
};
