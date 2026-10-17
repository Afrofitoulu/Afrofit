import { supabase } from "../lib/supabase";
import { formatClassTime } from "../lib/format";

const $ = (id: string) => document.getElementById(id)!;

let started = false;

// Deletes classes that started more than 24 hours ago
async function cleanup() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("classes").delete().lt("starts", cutoff);
  if (error) console.error("Cleanup failed", error);
}

function renderClass(c: any) {
  const box = document.createElement("article");

  const title = document.createElement("h3");
  title.textContent = `${c.name} · ${formatClassTime(c.starts)}`;

  const count = document.createElement("p");
  count.textContent = `${c.signups.length} signed up`;

  const list = document.createElement("ul");
  for (const s of c.signups) {
    const li = document.createElement("li");
    li.textContent = `${s.name} – ${s.phone}`;
    list.append(li);
  }

  const del = document.createElement("button");
  del.type = "button";
  del.className = "delete-class-btn";
  del.textContent = "Delete class";
  del.dataset.classId = String(c.id);
  del.dataset.className = c.name;
  del.dataset.count = String(c.signups.length);

  box.append(title, count, list, del);
  return box;
}

async function loadList() {
  $("admin-list-error").hidden = true;

  const { data, error } = await supabase
    .from("classes")
    .select("id, name, starts, signups(id, name, phone)")
    .order("starts")
    .order("created_at", { referencedTable: "signups" });

  if (error || !data) {
    console.error(error);
    $("admin-list-error").textContent = "Couldn't load classes.";
    $("admin-list-error").hidden = false;
    return;
  }

  const now = Date.now();
  const upcoming = data.filter((c) => new Date(c.starts).getTime() > now);
  const past = data.filter((c) => new Date(c.starts).getTime() <= now);

  $("admin-upcoming").replaceChildren(...upcoming.map(renderClass));
  $("admin-past").replaceChildren(...past.map(renderClass));
  $("admin-upcoming-empty").hidden = upcoming.length > 0;
  $("admin-past-section").hidden = past.length === 0;
}

async function start() {
  if (started) return;
  started = true;
  await cleanup();
  await loadList();
}

function stop() {
  started = false;
  $("admin-upcoming").replaceChildren();
  $("admin-past").replaceChildren();
}

supabase.auth.getSession().then(({ data }) => {
  if (data.session) start();
});

supabase.auth.onAuthStateChange((_event, session) => {

  setTimeout(() => (session ? start() : stop()), 0);
});

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest(".delete-class-btn") as HTMLElement | null;
  if (!btn) return;

  const { classId, className, count } = btn.dataset;
  if (!confirm(`Delete "${className}" and its ${count} signup(s)?`)) return;

  const { error } = await supabase.from("classes").delete().eq("id", Number(classId));
  if (error) {
    console.error(error);
    $("admin-list-error").textContent = "Couldn't delete the class.";
    $("admin-list-error").hidden = false;
    return;
  }
  loadList();
});


document.addEventListener("classes-changed", loadList);