// ===============================
// KONFIGURATION
// ===============================

const OAUTH_START_URL =
  "https://unrenunciable-illusive-kanesha.ngrok-free.dev/webhook/oauth/google/start";

const PREPARE_EVENT_URL =
  "https://unrenunciable-illusive-kanesha.ngrok-free.dev/webhook/calendar/prepare";

const CREATE_EVENT_URL =
  "https://unrenunciable-illusive-kanesha.ngrok-free.dev/webhook/calendar/create";

// ===============================
// UI ELEMENTE
// ===============================

const views = {
  login: document.getElementById("login"),
  loading: document.getElementById("loading"),
  content: document.getElementById("content"),
  error: document.getElementById("error"),
  success: document.getElementById("success"),
};

const statusText = document.getElementById("status-text");
const loginBtn = document.getElementById("login-btn");
const addBtn = document.getElementById("add-btn");
const logoutBtn = document.getElementById("logout-btn");

// ===============================
// HILFSFUNKTIONEN
// ===============================

function showView(name) {
  Object.values(views).forEach((v) => {
    if (v) v.classList.add("hidden");
  });
  if (views[name]) views[name].classList.remove("hidden");
}

function setStatus(text) {
  statusText.textContent = text;
  console.log("[STATUS]", text);
}

function getStoredUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["userId"], (res) => {
      resolve(res.userId || null);
    });
  });
}

function storeUserId(userId) {
  return chrome.storage.local.set({ userId });
}

function splitDateTime(iso) {
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

// ===============================
// MARKIERTEN TEXT HOLEN
// ===============================

async function getSelectedText() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString(),
  });

  return result?.trim() || "";
}




// ===============================
// EVENT VOM BACKEND VORBEREITEN
// ===============================

async function prepareEvent(userId) {
  setStatus("Analysiere markierten Text…");
  showView("loading");

  const selectedText = await getSelectedText();

  if (!selectedText) {
    setStatus("Kein Text markiert");
    showView("error");
    return;
  }

  const res = await fetch(PREPARE_EVENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: selectedText,
      userId,
    }),
  });
console.log(res.status);
  if (res.status === 401) {
    await chrome.storage.local.remove("userId");
    setStatus("Bitte erneut anmelden");
    showView("login");
    return;
  } else if (!res.ok) {
    setStatus("Backend-Fehler beim Analysieren");
    showView("error");
    return;
  }

  const data = await res.json();

  // 🔴 WICHTIG: Backend liefert ARRAY
  const event = data[0];


  
  if (!event || !event.title || !event.start) {
    setStatus("Unvollständige Event-Daten");
    showView("error");
    return;
  }

  // Formular befüllen
  document.getElementById("title").value = event.title;
  document.getElementById("description").value =
    event.description || "";

  const { date, time } = splitDateTime(event.start);
  document.getElementById("date").value = date;
  document.getElementById("time").value = time;

  setStatus("Event erkannt");
  showView("content");
}

// ===============================
// LOGIN CHECK BEIM ÖFFNEN
// ===============================

document.addEventListener("DOMContentLoaded", async () => {
  setStatus("Prüfe Login-Status…");

  const userId = await getStoredUserId();

  if (!userId) {
    setStatus("Nicht eingeloggt");
    showView("login");
  } else {
    document.getElementById("logout-btn").classList.remove("hidden");
    await prepareEvent(userId);
  }
});

// ===============================
// OAUTH LOGIN
// ===============================

loginBtn.addEventListener("click", () => {
  setStatus("Öffne Google Login…");

  const popup = window.open(
    OAUTH_START_URL,
    "oauth",
    "width=500,height=600"
  );

  window.addEventListener("message", async (event) => {
    if (event.data?.type !== "OAUTH_SUCCESS") return;

    const userId = event.data.payload?.userId;
    if (!userId) {
      setStatus("Login fehlgeschlagen");
      showView("error");
      return;
    }

    await storeUserId(userId);
    await prepareEvent(userId);

    popup?.close();
  });
});

// ===============================
// LOGOUT
// ===============================
async function logout() {
  await chrome.storage.local.remove("userId");
  document.getElementById("logout-btn").classList.add("hidden");
  setStatus("Abgemeldet");
  showView("login");
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await logout();
  });
}


// ===============================
// EVENT ERSTELLEN
// ===============================

addBtn.addEventListener("click", async () => {
  const userId = await getStoredUserId();
  if (!userId) {
    setStatus("Nicht eingeloggt");
    showView("login");
    return;
  }

  const title = document.getElementById("title").value;
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const description = document.getElementById("description").value;

  if (!title || !date || !time) {
    setStatus("Bitte alle Pflichtfelder ausfüllen");
    showView("error");
    return;
  }

  const start = `${date}T${time}:00`;

  setStatus("Erstelle Kalendereintrag…");
  showView("loading");

  try {
    const res = await fetch(CREATE_EVENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title,
        start,
        end: start,
        description
      }),
    });

    const raw = await res.text();

    if (!raw) {
      setStatus("Keine Antwort vom Backend");
      showView("error");
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Ungültiges JSON:", raw);
      setStatus("Ungültige Backend-Antwort");
      showView("error");
      return;
    }

    // 
    const eventStatus = data.success;

    if (eventStatus !== true) {
      setStatus("Event konnte nicht erstellt werden");
      showView("error");
      console.log(data);
      console.log(eventStatus.success);

      return;
    }

    // ✅ Erfolgsfall
    setStatus("Event erfolgreich erstellt");
    showView("success");

    // Optional: Event-Link öffnen
    // chrome.tabs.create({ url: eventStatus.eventLink });

  } catch (err) {
    console.error(err);
    setStatus("Fehler beim Erstellen des Events");
    showView("error");
  }
});

