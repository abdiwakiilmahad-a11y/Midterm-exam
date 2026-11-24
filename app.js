(() => {
  const SUBJECTS = ["Discrete Math", "HTML", "RDBMS", "SQL", "Academic Writing", "Physics", "C++"];
  const KEY = "midterm-blog-local-v1";
  const $ = (id) => document.getElementById(id);

  let published = [];   // from data/exams.json
  let local = [];       // saved in this browser
  let tab = "All";
  let editingId = null;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => /^(https?:\/\/|[\w./-]+$)/i.test(u || "") ? u : "";

  function loadLocal() {
    try { local = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { local = []; }
  }
  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(local)); }
    catch { alert("Could not save in this browser. Use Export JSON to keep your data."); }
  }
  const all = () => {
    const ids = new Set(local.map((e) => e.id));
    return [...local, ...published.filter((e) => !ids.has(e.id))]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  };

  async function loadPublished() {
    try {
      const r = await fetch("data/exams.json", { cache: "no-store" });
      if (r.ok) published = await r.json();
    } catch { published = []; }
  }

  // body text -> html, supports ```lang code fences
  function renderBody(text) {
    if (!text) return "";
    return text.split(/```/).map((part, i) => {
      if (i % 2) return "<pre><code>" + esc(part.replace(/^[\w+-]*\n/, "")) + "</code></pre>";
      return part.trim() ? "<p>" + esc(part.trim()) + "</p>" : "";
    }).join("");
  }

  function pct(e) { return e.total ? (e.score / e.total) * 100 : null; }

  function renderStats(list) {
    const graded = list.filter((e) => pct(e) !== null && e.score !== "" && e.score != null);
    const avg = graded.length ? Math.round(graded.reduce((s, e) => s + pct(e), 0) / graded.length) : null;
    $("stats").innerHTML =
      `<div class="stat"><b>${list.length}</b><span>Exams recorded</span></div>` +
      `<div class="stat"><b>${new Set(list.map((e) => e.subject)).size}/${SUBJECTS.length}</b><span>Subjects covered</span></div>` +
      `<div class="stat"><b>${avg === null ? "–" : avg + "%"}</b><span>Average score</span></div>`;
  }

  function renderTabs(list) {
    const names = ["All", ...SUBJECTS];
    $("tabs").innerHTML = names.map((n) => {
      const c = n === "All" ? list.length : list.filter((e) => e.subject === n).length;
      return `<button class="tab ${n === tab ? "on" : ""}" data-t="${esc(n)}">${esc(n)}<small>${c}</small></button>`;
    }).join("");
  }

  function render() {
    const list = all();
    renderStats(list);
    renderTabs(list);
    const q = $("search").value.trim().toLowerCase();
    const shown = list.filter((e) =>
      (tab === "All" || e.subject === tab) &&
      (!q || [e.title, e.subject, (e.topics || []).join(" "), e.body, e.notes].join(" ").toLowerCase().includes(q)));

    if (!shown.length) {
      $("list").innerHTML = `<div class="empty">No exams here yet.<br>Click <b>+ Add exam</b> to record your first ${tab === "All" ? "midterm" : esc(tab) + " midterm"}.</div>`;
      return;
    }
    const localIds = new Set(local.map((e) => e.id));
    $("list").innerHTML = shown.map((e) => {
      const p = pct(e);
      const cls = p === null ? "" : p >= 75 ? "good" : p >= 50 ? "mid" : "bad";
      const hasScore = e.score !== "" && e.score != null && e.total;
      const img = safeUrl(e.image);
      return `<article class="card">
        <header>
          <div>
            <span class="badge">${esc(e.subject)}</span>
            <h3>${esc(e.title)}</h3>
            <div class="meta">${esc(e.date || "")}</div>
          </div>
          ${hasScore ? `<div class="score ${cls}">${esc(e.score)}/${esc(e.total)}<small>${Math.round(p)}%</small></div>` : ""}
        </header>
        ${(e.topics || []).length ? `<div class="chips">${e.topics.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>` : ""}
        <div class="body">
          ${e.body ? `<h4>Questions &amp; answers</h4>${renderBody(e.body)}` : ""}
          ${e.notes ? `<h4>What I learned</h4>${renderBody(e.notes)}` : ""}
        </div>
        ${img ? `<img src="${esc(img)}" alt="Exam paper: ${esc(e.title)}" loading="lazy">` : ""}
        ${localIds.has(e.id) ? `<div class="actions"><button class="btn sm" data-edit="${esc(e.id)}">Edit</button><button class="btn sm danger" data-del="${esc(e.id)}">Delete</button></div>` : ""}
      </article>`;
    }).join("");
  }

  // ---- form ----
  function openForm(entry) {
    editingId = entry ? entry.id : null;
    $("dlgTitle").textContent = entry ? "Edit exam" : "Add exam";
    $("f-subject").innerHTML = SUBJECTS.map((s) => `<option>${esc(s)}</option>`).join("");
    $("f-subject").value = entry ? entry.subject : (SUBJECTS.includes(tab) ? tab : SUBJECTS[0]);
    $("f-title").value = entry?.title || "";
    $("f-date").value = entry?.date || new Date().toISOString().slice(0, 10);
    $("f-score").value = entry?.score ?? "";
    $("f-total").value = entry?.total ?? "";
    $("f-topics").value = (entry?.topics || []).join(", ");
    $("f-body").value = entry?.body || "";
    $("f-notes").value = entry?.notes || "";
    $("f-image").value = entry?.image || "";
    $("dlg").showModal();
  }

  $("form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const num = (v) => (v === "" ? "" : Number(v));
    const entry = {
      id: editingId || "e" + Date.now(),
      subject: $("f-subject").value,
      title: $("f-title").value.trim(),
      date: $("f-date").value,
      score: num($("f-score").value),
      total: num($("f-total").value),
      topics: $("f-topics").value.split(",").map((t) => t.trim()).filter(Boolean),
      body: $("f-body").value,
      notes: $("f-notes").value,
      image: $("f-image").value.trim(),
    };
    local = local.filter((e) => e.id !== entry.id);
    local.push(entry);
    saveLocal();
    $("dlg").close();
    tab = entry.subject;
    render();
  });

  // ---- events ----
  $("addBtn").onclick = () => openForm();
  $("cancelBtn").onclick = () => $("dlg").close();
  $("search").oninput = render;
  $("tabs").onclick = (e) => { const b = e.target.closest("[data-t]"); if (b) { tab = b.dataset.t; render(); } };
  $("list").onclick = (e) => {
    const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
    if (ed) openForm(local.find((x) => x.id === ed.dataset.edit));
    if (del && confirm("Delete this exam entry?")) {
      local = local.filter((x) => x.id !== del.dataset.del); saveLocal(); render();
    }
  };
  $("exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(all(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "exams.json"; a.click();
    URL.revokeObjectURL(a.href);
  };
  $("importFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data)) throw 0;
      const ids = new Set(local.map((x) => x.id));
      data.forEach((x) => { if (x && x.id && !ids.has(x.id)) local.push(x); });
      saveLocal(); render();
    } catch { alert("That file is not a valid exams.json"); }
    e.target.value = "";
  };

  loadLocal();
  loadPublished().then(render);
  render();
})();
