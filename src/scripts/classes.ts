import { supabase } from "../lib/supabase";
import { formatClassTime } from "../lib/format";

const $ = (id: string) => document.getElementById(id)!;

function renderList(classes: any[]) {
  const list = $("class-list-items");
  list.replaceChildren();

  for (const c of classes) {
    const li = document.createElement("li");

    const details = document.createElement("span");

    const name = document.createElement("span");
    name.className = "class-title";
    name.textContent = c.name;

    const when = document.createElement("time");
    when.dateTime = c.starts;
    when.textContent = formatClassTime(c.starts);
    details.append(name, when);

    if (c.notes?.trim()) {
      const notes = document.createElement("span");
      notes.className = "class-notes";
      notes.textContent = c.notes;
      details.append(notes);
    }

    const link = document.createElement("a");
    link.className = "class-signup-btn";
    link.href = `/signup?class=${encodeURIComponent(c.id)}`;
    link.setAttribute("aria-label", `Sign up for ${c.name}`);
    const chevron = document.createElement("span");
    chevron.className = "class-chevron";
    chevron.setAttribute("aria-hidden", "true");
    link.append(details, chevron);

    li.append(link);
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
