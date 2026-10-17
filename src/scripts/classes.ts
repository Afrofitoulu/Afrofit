import { supabase } from "../lib/supabase";
import { formatClassTime } from "../lib/format";

const $ = (id: string) => document.getElementById(id)!;

function renderHero(next: any) {
  $("next-class-name").textContent = next.name;
  $("next-class-date").textContent = formatClassTime(next.starts);
  $("next-class-notes").textContent = next.notes ?? "";
  ($("signup-open-btn") as HTMLAnchorElement).href = `/signup?class=${next.id}`;
  $("class-details").hidden = false;
}

function renderList(classes: any[]) {
  const list = $("class-list-items");
  list.replaceChildren();

  for (const c of classes) {
    const li = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = c.name;

    const when = document.createElement("span");
    when.textContent = " · " + formatClassTime(c.starts);

    const link = document.createElement("a");
    link.className = "class-signup-btn";
    link.href = `/signup?class=${c.id}`;
    link.textContent = "Sign up";

    li.append(name, when, " ", link);
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

  renderHero(data[0]);
  renderList(data);
}

loadClasses();