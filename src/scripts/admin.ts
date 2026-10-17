import { supabase } from "../lib/supabase";

const $ = (id: string) => document.getElementById(id)!;
const input = (id: string) => $(id) as HTMLInputElement;

function showLoggedIn(email: string | undefined) {
  $("login-panel").hidden = true;
  $("admin-panel").hidden = false;
  $("admin-email").textContent = email ?? "";
}

function showLoggedOut() {
  $("admin-panel").hidden = true;
  $("login-panel").hidden = false;
}

async function init() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    showLoggedIn(data.session.user.email);
  } else {
    showLoggedOut();
  }
}

// Keeps the page in sync if the session changes (login, logout, expiry)
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showLoggedIn(session.user.email);
  } else {
    showLoggedOut();
  }
});

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-error").hidden = true;

  const btn = $("login-btn") as HTMLButtonElement;
  btn.disabled = true;

  const { error } = await supabase.auth.signInWithPassword({
    email: input("login-email").value.trim(),
    password: input("login-password").value,
  });

  btn.disabled = false;

  if (error) {
    console.error(error);
    $("login-error").textContent = "Wrong email or password.";
    $("login-error").hidden = false;
    return;
  }

  input("login-password").value = "";
});

$("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
});

init();
