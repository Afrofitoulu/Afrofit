import { supabase } from "../lib/supabase";
import { formatClassTime } from "../lib/format";

const $ = (id: string) => document.getElementById(id)!;

let started = false;

// Deletes classes that started more than 24 hours ago
async function cleanup() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("classes").delete().lt("starts", cutoff);
  if (error) {
    console.error("Cleanup failed", error);
  }
}

function renderClass(classItem: any) {
  const box = document.createElement("article");

  const title = document.createElement("h3");
  title.textContent = `${classItem.name} · ${formatClassTime(classItem.starts)}`;

  const count = document.createElement("p");
  count.textContent = `${classItem.signups.length} signed up`;

  const list = document.createElement("ul");
  for (const signup of classItem.signups) {
    const li = document.createElement("li");
    li.textContent = `${signup.name} – ${signup.phone}`;
    list.append(li);
  }

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-class-btn";
  deleteButton.textContent = "Delete class";
  deleteButton.dataset.classId = String(classItem.id);
  deleteButton.dataset.className = classItem.name;
  deleteButton.dataset.count = String(classItem.signups.length);

  box.append(title, count, list, deleteButton);
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
  const upcomingList = $("admin-upcoming");
  const pastList = $("admin-past");
  upcomingList.replaceChildren();
  pastList.replaceChildren();

  for (const classItem of data) {
    const starts = new Date(classItem.starts).getTime();
    if (starts > now) {
      upcomingList.append(renderClass(classItem));
    } else if (starts <= now) {
      pastList.append(renderClass(classItem));
    }
  }

  $("admin-upcoming-empty").hidden = upcomingList.children.length > 0;
  $("admin-past-section").hidden = pastList.children.length === 0;
}

async function start() {
  if (started) {
    return;
  }
  started = true;
  await cleanup();
  await loadList();
}

function stop() {
  started = false;
  $("admin-upcoming").replaceChildren();
  $("admin-past").replaceChildren();
}

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await start();
  }
}

checkSession();

supabase.auth.onAuthStateChange((_event, session) => {
  // Run database requests after the auth callback has finished.
  setTimeout(() => {
    if (session) {
      start();
    } else {
      stop();
    }
  }, 0);
});

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest(".delete-class-btn") as HTMLElement | null;
  if (!btn) {
    return;
  }

  const { classId, className, count } = btn.dataset;
  const confirmed = confirm(`Delete "${className}" and its ${count} signup(s)?`);
  if (!confirmed) {
    return;
  }

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
