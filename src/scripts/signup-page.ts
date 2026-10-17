import { supabase } from "../lib/supabase";
import { formatClassTime } from "../lib/format";

const $ = (id: string) => document.getElementById(id)!;
const input = (id: string) => $(id) as HTMLInputElement;
const select = $("form-class") as HTMLSelectElement;

type ClassRow = {
  id: number;
  name: string;
  starts: string;
  notes: string | null;
};

let classes: ClassRow[] = [];
let submitting = false;
const fields = ["form-class", "form-name", "form-phone", "form-consent"];

function fieldError(field: string, message: string) {
  $(`${field}-error`).textContent = message;
  $(`${field}-error`).hidden = false;
  $(field).setAttribute("aria-invalid", "true");
}

function clearFieldError(field: string) {
  $(`${field}-error`).hidden = true;
  $(field).removeAttribute("aria-invalid");
}

for (const field of fields) {
  $(field).addEventListener("input", () => clearFieldError(field));
}

function showError(message: string) {
  $("form-error").textContent = message;
  $("form-error").hidden = false;
}

function getSelectedClass() {
  for (const classItem of classes) {
    if (String(classItem.id) === select.value) {
      return classItem;
    }
  }
}

function showNotes() {
  const chosen = getSelectedClass();
  $("form-class-info").hidden = true;
  $("form-class-notes").textContent = "";

  if (chosen && chosen.notes && chosen.notes.trim()) {
    $("form-class-notes").textContent = chosen.notes;
    $("form-class-info").hidden = false;
  }
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

  // /signup?class=12 opens with that class selected.
  // If the id is missing or the class has passed, the next class stays selected.
  const wanted = new URLSearchParams(location.search).get("class");
  select.replaceChildren();
  for (const classItem of classes) {
    const option = document.createElement("option");
    option.value = String(classItem.id);
    option.textContent = `${classItem.name} (${formatClassTime(classItem.starts)})`;
    select.append(option);

    if (option.value === wanted) {
      option.selected = true;
    }
  }

  select.disabled = false;
  ($("form-submit") as HTMLButtonElement).disabled = false;
  showNotes();
}

select.addEventListener("change", showNotes);

$("signup-page-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submitting) {
    return;
  }
  $("form-error").hidden = true;
  for (const field of fields) {
    clearFieldError(field);
  }

  // Copy everything before the await, so changes while saving can't affect it
  const chosen = getSelectedClass();
  const name = input("form-name").value.trim();
  const phone = input("form-phone").value.trim();

  if (!chosen) {
    fieldError("form-class", "Please choose a class.");
  }
  if (!name) {
    fieldError("form-name", "Please enter your name.");
  }
  const validPhone = /^[0-9+()\-\s.]{6,30}$/.test(phone);
  if (!validPhone) {
    fieldError("form-phone", "Please enter a valid phone number.");
  }
  if (!input("form-consent").checked) {
    fieldError("form-consent", "Please tick the box to continue.");
  }

  const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (invalid) {
    invalid.focus();
    return;
  }
  if (!chosen) {
    return;
  }

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
      showError("Something went wrong. Please try again.");
      return;
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
