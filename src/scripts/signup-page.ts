import { supabase } from "../lib/supabase";
import { formatClassTime } from "../lib/format";

const $ = (id: string) => document.getElementById(id)!;
const input = (id: string) => $(id) as HTMLInputElement;
const select = $("form-class") as HTMLSelectElement;

type ClassRow = { id: number; name: string; starts: string; notes: string | null };

let classes: ClassRow[] = [];

function showError(message: string) {
  $("form-error").textContent = message;
  $("form-error").hidden = false;
}

// Shows the class notes (if any) under the dropdown
function showNotes() {
  const chosen = classes.find((c) => String(c.id) === select.value);
  $("form-class-notes").textContent = chosen?.notes ?? "";
  $("form-class-notes").hidden = !chosen?.notes;
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
    $("signup-page-form").hidden = true;
    $("form-load-error").hidden = false;
    return;
  }

  if (!data || data.length === 0) {
    $("signup-page-form").hidden = true;
    $("form-no-classes").hidden = false;
    return;
  }

  classes = data;

  select.replaceChildren(
    ...classes.map((c) => {
      const option = document.createElement("option");
      option.value = String(c.id);
      option.textContent = `${c.name} (${formatClassTime(c.starts)})`;
      return option;
    })
  );

  // /signup?class=12 opens with that class selected.
  // If the id is missing or the class has passed, the next class stays selected.
  const wanted = new URLSearchParams(location.search).get("class");
  if (wanted && classes.some((c) => String(c.id) === wanted)) {
    select.value = wanted;
  }

  select.disabled = false;
  showNotes();
}

select.addEventListener("change", showNotes);

$("signup-page-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("form-error").hidden = true;

  // Copy everything before the await, so changes while saving can't affect it
  const chosen = classes.find((c) => String(c.id) === select.value);
  const name = input("form-name").value.trim();
  const phone = input("form-phone").value.trim();

  if (!chosen) return showError("Please choose a class.");
  if (!name) return showError("Please enter your name.");
  if (!/^[0-9+()\-\s.]{6,30}$/.test(phone))
    return showError("Please enter a valid phone number.");
  if (!input("form-consent").checked)
    return showError("Please tick the box to continue.");

  const btn = $("form-submit") as HTMLButtonElement;
  btn.disabled = true; // stops double-clicks creating two requests

  const { error } = await supabase
    .from("signups")
    .insert({ class_id: chosen.id, name, phone });

  btn.disabled = false;

  if (error) {
    if (error.code === "23505")
      return showError("This number is already signed up for this class.");
    if (error.code === "42501")
      return showError("Sign-up for this class has closed.");
    console.error(error);
    return showError("Something went wrong. Please try again.");
  }

  $("signup-page-form").hidden = true;
  $("form-done").textContent =
    `You're signed up for ${chosen.name}, ${formatClassTime(chosen.starts)}.`;
  $("form-done").hidden = false;
});

loadClasses();