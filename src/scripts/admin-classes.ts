import { supabase } from "../lib/supabase";

const $ = (id: string) => document.getElementById(id)!;
const input = (id: string) => $(id) as HTMLInputElement;

function show(id: "add-class-error" | "add-class-success", message: string) {
  $("add-class-error").hidden = true;
  $("add-class-success").hidden = true;
  $(id).textContent = message;
  $(id).hidden = false;
}

$("add-class-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = input("class-name").value.trim();
  const startsValue = input("class-starts").value;
  const notesInput = $("class-notes") as HTMLTextAreaElement;
  const notes = notesInput.value.trim();

  if (!name) {
    show("add-class-error", "Please enter a name.");
    return;
  }
  if (!startsValue) {
    show("add-class-error", "Please pick a date and time.");
    return;
  }

  const startsDate = new Date(startsValue); // read in this browser's time zone
  if (startsDate.getTime() <= Date.now()) {
    show("add-class-error", "That time is in the past.");
    return;
  }

  const btn = $("add-class-btn") as HTMLButtonElement;
  btn.disabled = true;

  const { error } = await supabase.from("classes").insert({
    name,
    starts: startsDate.toISOString(),
    notes: notes || null,
  });

  btn.disabled = false;

  if (error) {
    console.error(error);
    show("add-class-error", "Couldn't save the class. Are you logged in?");
    return;
  }

  show("add-class-success", `Added "${name}".`);
  (e.target as HTMLFormElement).reset();

  document.dispatchEvent(new CustomEvent("classes-changed"));
});
