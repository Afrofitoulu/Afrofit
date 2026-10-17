import { supabase } from "../lib/supabase";
import { formatClassTime } from "../lib/format";

const $ = (id: string) => document.getElementById(id)!;

function renderList(classes: any[]) {
  const list = $("class-list-items");
  list.replaceChildren();

  for (const c of classes) {
    const li = document.createElement("li");
    li.dataset.classId = String(c.id);

    const details = document.createElement("div");

    const name = document.createElement("h3");
    name.textContent = c.name;

    const when = document.createElement("time");
    when.dateTime = c.starts;
    when.textContent = formatClassTime(c.starts);
    details.append(name, when);

    if (c.notes?.trim()) {
      const notes = document.createElement("p");
      notes.textContent = c.notes;
      details.append(notes);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "class-signup-btn";
    btn.setAttribute("aria-label", `Sign up for ${c.name}`);
    const chevron = document.createElement("span");
    chevron.className = "class-chevron";
    chevron.setAttribute("aria-hidden", "true");
    btn.append(chevron);
    btn.dataset.classId = String(c.id);
    btn.dataset.classStarts = c.starts;
    btn.dataset.className = c.name;

    li.append(details, btn);
    list.append(li);
  }

  $("upcoming-classes").hidden = classes.length === 0;
}

async function loadClasses() {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, starts, notes")
    .gt("starts", new Date().toISOString())
    .order("starts")
    .limit(30);

  if (error) {
    console.error(error);
    $("hero-error").hidden = false;
    return;
  }

  if (!data || data.length === 0) {
    $("no-class-message").hidden = false;
    return;
  }

  renderList(data);
}

loadClasses();
