const ACCOUNT_KEY = "midterm_student_account";
const SESSION_KEY = "midterm_logged_in_session";
const EXAMS_KEY = "midterm_exam_records_v1";

let exams = [];
let activeFilter = "All";

// DOM Elements
const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authError = document.getElementById("authError");

// Switch Auth Tabs
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  authError.classList.add("hidden");
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  authError.classList.add("hidden");
});

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove("hidden");
}

// Register Account
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const account = {
    name: document.getElementById("regName").value.trim(),
    studentId: document.getElementById("regId").value.trim(),
    username: document.getElementById("regUser").value.trim().toLowerCase(),
    pin: document.getElementById("regPin").value
  };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  openDashboard(account);
});

// Log In
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const saved = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
  const user = document.getElementById("loginUser").value.trim().toLowerCase();
  const pin = document.getElementById("loginPin").value;

  if (!saved) {
    showAuthError("No account found yet. Click 'Create Account' or 'Quick Demo Student Login'.");
    return;
  }
  if (saved.username === user && saved.pin === pin) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(saved));
    openDashboard(saved);
  } else {
    showAuthError("Incorrect username or password/PIN.");
  }
});

// Demo Login
document.getElementById("demoLoginBtn").addEventListener("click", () => {
  const demoAccount = {
    name: "CS Student",
    studentId: "MID-2026",
    username: "student",
    pin: "1234"
  };
  if (!localStorage.getItem(ACCOUNT_KEY)) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(demoAccount));
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(demoAccount));
  openDashboard(demoAccount);
});

// Log Out
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
});

// Grade Calculation
function getGrade(score, maxScore) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  let letter = "F";
  if (pct >= 90) letter = "A";
  else if (pct >= 80) letter = "B";
  else if (pct >= 70) letter = "C";
  else if (pct >= 60) letter = "D";
  return { pct, letter };
}

function updateLiveGrade() {
  const s = parseFloat(document.getElementById("score").value);
  const m = parseFloat(document.getElementById("maxScore").value);
  const preview = document.getElementById("liveGrade");
  if (!isNaN(s) && !isNaN(m) && m > 0) {
    const { pct, letter } = getGrade(s, m);
    preview.textContent = `${pct}% (${letter})`;
  } else {
    preview.textContent = "—";
  }
}

document.getElementById("score").addEventListener("input", updateLiveGrade);
document.getElementById("maxScore").addEventListener("input", updateLiveGrade);

// Load Initial Data (from localStorage or exams.json fallback)
async function loadExams() {
  const local = localStorage.getItem(EXAMS_KEY);
  if (local) {
    exams = JSON.parse(local);
    renderAll();
    return;
  }
  try {
    const res = await fetch("exams.json");
    exams = await res.json();
  } catch {
    exams = [];
  }
  saveExams();
  renderAll();
}

function saveExams() {
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

// Save or Update Exam Form
document.getElementById("examForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const editId = document.getElementById("editId").value;
  const entry = {
    id: editId || String(Date.now()),
    subject: document.getElementById("subject").value,
    date: document.getElementById("examDate").value,
    score: parseFloat(document.getElementById("score").value),
    maxScore: parseFloat(document.getElementById("maxScore").value),
    notes: document.getElementById("notes").value.trim()
  };

  if (editId) {
    exams = exams.map((item) => (item.id === editId ? entry : item));
  } else {
    exams.unshift(entry);
  }

  saveExams();
  resetForm();
  renderAll();
});

function resetForm() {
  document.getElementById("examForm").reset();
  document.getElementById("editId").value = "";
  document.getElementById("maxScore").value = 50;
  document.getElementById("examDate").valueAsDate = new Date();
  document.getElementById("formTitle").textContent = "Record New Midterm Exam";
  document.getElementById("saveBtn").textContent = "Save Midterm Record";
  document.getElementById("cancelEditBtn").classList.add("hidden");
  updateLiveGrade();
}

document.getElementById("cancelEditBtn").addEventListener("click", resetForm);

// Filter & Search
document.getElementById("filterPills").addEventListener("click", (e) => {
  if (!e.target.classList.contains("pill")) return;
  document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
  e.target.classList.add("active");
  activeFilter = e.target.dataset.subject;
  renderAll();
});

document.getElementById("searchInput").addEventListener("input", renderAll);

// Render Stats & Cards
function renderAll() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = exams.filter((item) => {
    const matchSub = activeFilter === "All" || item.subject === activeFilter;
    const matchText =
      item.subject.toLowerCase().includes(query) ||
      item.notes.toLowerCase().includes(query);
    return matchSub && matchText;
  });

  // Update Stats
  const uniqueSubjects = new Set(exams.map((e) => e.subject));
  document.getElementById("statCount").textContent = `${uniqueSubjects.size} / 7 Subjects`;

  if (exams.length > 0) {
    let totalPct = 0;
    let best = exams[0];
    let bestPct = getGrade(best.score, best.maxScore).pct;

    exams.forEach((item) => {
      const p = getGrade(item.score, item.maxScore).pct;
      totalPct += p;
      if (p > bestPct) {
        best = item;
        bestPct = p;
      }
    });
    document.getElementById("statAvg").textContent = `${Math.round(totalPct / exams.length)}%`;
    document.getElementById("statTop").textContent = `${best.subject} (${bestPct}%)`;
  } else {
    document.getElementById("statAvg").textContent = "0%";
    document.getElementById("statTop").textContent = "—";
  }

  // Render Posts
  const feed = document.getElementById("postsFeed");
  feed.innerHTML = "";

  if (filtered.length === 0) {
    feed.innerHTML = `<p style="color:#64748b;">No midterm records found. Add your first exam above!</p>`;
    return;
  }

  filtered.forEach((item) => {
    const { pct, letter } = getGrade(item.score, item.maxScore);
    const card = document.createElement("article");
    card.className = "post-card";
    card.innerHTML = `
      <div>
        <div class="post-top">
          <span class="subject-tag">${item.subject}</span>
          <span class="post-date">${item.date}</span>
        </div>
        <div class="score-row">
          <span class="score-num">${item.score} / ${item.maxScore}</span>
          <span class="grade-badge">${pct}% • Grade ${letter}</span>
        </div>
        <p class="post-notes"></p>
      </div>
      <div class="post-footer">
        <button type="button" class="btn btn-outline btn-sm edit-btn">Edit</button>
        <button type="button" class="btn btn-danger btn-sm del-btn">Delete</button>
      </div>
    `;
    card.querySelector(".post-notes").textContent = item.notes;

    card.querySelector(".edit-btn").addEventListener("click", () => {
      document.getElementById("editId").value = item.id;
      document.getElementById("subject").value = item.subject;
      document.getElementById("examDate").value = item.date;
      document.getElementById("score").value = item.score;
      document.getElementById("maxScore").value = item.maxScore;
      document.getElementById("notes").value = item.notes;
      document.getElementById("formTitle").textContent = "Edit Midterm Exam";
      document.getElementById("saveBtn").textContent = "Update Record";
      document.getElementById("cancelEditBtn").classList.remove("hidden");
      updateLiveGrade();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    card.querySelector(".del-btn").addEventListener("click", () => {
      exams = exams.filter((e) => e.id !== item.id);
      saveExams();
      renderAll();
    });

    feed.appendChild(card);
  });
}

// Export & Import JSON for GitHub Sync
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(exams, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "exams.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (Array.isArray(imported)) {
        exams = imported;
        saveExams();
        renderAll();
      }
    } catch {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
});

function openDashboard(account) {
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  document.getElementById("studentBanner").textContent = `${account.name} (${account.studentId})`;
  document.getElementById("examDate").valueAsDate = new Date();
  loadExams();
}

// Check Existing Session on Page Load
const activeSession = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
if (activeSession) {
  openDashboard(activeSession);
}
