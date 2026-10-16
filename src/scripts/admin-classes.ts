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
  const startsValue = input("class-starts").value; // e.g. "2026-10-20T18:00"
  const notes = (input("class-notes") as unknown as HTMLTextAreaElement).value.trim();

  if (!name) return show("add-class-error", "Please enter a name.");
  if (!startsValue) return show("add-class-error", "Please pick a date and time.");

  const startsDate = new Date(startsValue); // read in this browser's time zone
  if (startsDate.getTime() <= Date.now())
    return show("add-class-error", "That time is in the past.");

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
    return show("add-class-error", "Couldn't save the class. Are you logged in?");
  }

  show("add-class-success", `Added "${name}".`);
  (e.target as HTMLFormElement).reset();

  // The class list (next step) listens for this and reloads itself
  document.dispatchEvent(new CustomEvent("classes-changed"));
});