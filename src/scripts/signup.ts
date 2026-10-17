import { supabase } from "../lib/supabase";
import { formatClassTime } from "../lib/format";

const $ = (id: string) => document.getElementById(id)!;
const input = (id: string) => $(id) as HTMLInputElement;

let selected: { id: number; name: string; starts: string } | null = null;

function showError(message: string) {
  $("signup-error").textContent = message;
  $("signup-error").hidden = false;
}

function openForm(id: string, name: string, starts: string) {
  selected = { id: Number(id), name, starts };
  $("signup-class-label").textContent = `${name} · ${formatClassTime(starts)}`;
  $("signup-error").hidden = true;
  $("signup-success").hidden = true;
  $("signup-form").hidden = false;
  $("signup-form").scrollIntoView({ behavior: "smooth", block: "center" });
  input("signup-name").focus();
}

function closeForm() {
  $("signup-form").hidden = true;
  selected = null;
}

// One listener handles every list button
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;

  const listBtn = target.closest(".class-signup-btn") as HTMLElement | null;
  if (listBtn) {
    openForm(
      listBtn.dataset.classId!,
      listBtn.dataset.className!,
      listBtn.dataset.classStarts!
    );
  }
});

$("signup-cancel-btn").addEventListener("click", closeForm);

$("signup-confirm-btn").addEventListener("click", async () => {
  if (!selected) return;
  $("signup-error").hidden = true;

  const name = input("signup-name").value.trim();
  const phone = input("signup-phone").value.trim();

  if (!name) return showError("Please enter your name.");
  if (!/^[0-9+()\-\s.]{6,30}$/.test(phone))
    return showError("Please enter a valid phone number.");
  if (!input("signup-consent").checked)
    return showError("Please tick the box to continue.");

  const btn = $("signup-confirm-btn") as HTMLButtonElement;
  btn.disabled = true; // stops double-clicks creating two requests

  const { error } = await supabase
    .from("signups")
    .insert({ class_id: selected.id, name, phone });

  btn.disabled = false;

  if (error) {
    if (error.code === "23505")
      return showError("This number is already signed up for this class.");
    if (error.code === "42501")
      return showError("Sign-up for this class has closed.");
    console.error(error);
    return showError("Something went wrong. Please try again.");
  }

  $("signup-success").textContent =
    `You're signed up for ${selected.name}, ${formatClassTime(selected.starts)}.`;
  $("signup-success").hidden = false;
  closeForm();
  input("signup-name").value = "";
  input("signup-phone").value = "";
  input("signup-consent").checked = false;
});
