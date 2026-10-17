import { supabase } from "../lib/supabase";
import { formatClassTime } from "../lib/format";

const $ = (id: string) => document.getElementById(id)!;
const input = (id: string) => $(id) as HTMLInputElement;
const select = $("form-class") as HTMLSelectElement;

type ClassRow = { id: number; name: string; starts: string; notes: string | null };

let classes: ClassRow[] = [];
let submitting = false;

function fieldError(field: string, message: string) {
  $(`${field}-error`).textContent = message;
  $(`${field}-error`).hidden = false;
  $(field).setAttribute("aria-invalid", "true");
}

function clearFieldError(field: string) {
  $(`${field}-error`).hidden = true;
  $(field).removeAttribute("aria-invalid");
}

for (const field of ["form-class", "form-name", "form-phone", "form-consent"]) {
  $(field).addEventListener("input", () => clearFieldError(field));
}

function showError(message: string) {
  $("form-error").textContent = message;
  $("form-error").hidden = false;
}

// Shows the class notes (if any) under the dropdown
function showNotes() {
  const chosen = classes.find((c) => String(c.id) === select.value);
  $("form-class-notes").textContent = chosen?.notes ?? "";
  $("form-class-info").hidden = !chosen?.notes?.trim();
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
  ($("form-submit") as HTMLButtonElement).disabled = false;
  showNotes();
}

select.addEventListener("change", showNotes);

$("signup-page-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submitting) return;
  $("form-error").hidden = true;
  for (const field of ["form-class", "form-name", "form-phone", "form-consent"]) {
    clearFieldError(field);
  }

  // Copy everything before the await, so changes while saving can't affect it
  const chosen = classes.find((c) => String(c.id) === select.value);
  const name = input("form-name").value.trim();
  const phone = input("form-phone").value.trim();

  if (!chosen) fieldError("form-class", "Please choose a class.");
  if (!name) fieldError("form-name", "Please enter your name.");
  if (!/^[0-9+()\-\s.]{6,30}$/.test(phone))
    fieldError("form-phone", "Please enter a valid phone number.");
  if (!input("form-consent").checked)
    fieldError("form-consent", "Please tick the box to continue.");

  const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (invalid) {
    invalid.focus();
    return;
  }
  if (!chosen) return;

  const btn = $("form-submit") as HTMLButtonElement;
  submitting = true;
  btn.disabled = true;
  btn.textContent = "Signing you up…";

  try {
    const { error } = await supabase
      .from("signups")
      .insert({ class_id: chosen.id, name, phone });

    if (error) {
      if (error.code === "23505") {
        fieldError("form-phone", "This number is already signed up for this class.");
        input("form-phone").focus();
        return;
      }
      if (error.code === "42501") {
        fieldError("form-class", "Sign-up is unavailable for this class. Please choose another class.");
        select.focus();
        return;
      }
      console.error(error);
      return showError("Something went wrong. Please try again.");
    }

    $("signup-page-form").hidden = true;
    $("form-heading").hidden = true;
    $("done-class").textContent = chosen.name;
    $("done-time").textContent = formatClassTime(chosen.starts);
    $("done-notes").textContent = chosen.notes ?? "";
    $("done-notes-row").hidden = !chosen.notes?.trim();
    $("done-name").textContent = name;
    $("done-phone").textContent = phone;
    $("form-done").hidden = false;
    $("thanks-title").focus();
  } catch (error) {
    console.error(error);
    showError("Couldn't save your sign-up. Please try again.");
  } finally {
    submitting = false;
    btn.disabled = false;
    btn.textContent = "Sign up";
  }
});

loadClasses();
