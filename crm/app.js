/* Prosty CRM – logika aplikacji. Dane przechowywane w localStorage. */
(function () {
  "use strict";

  const STORAGE_KEY = "crm.contacts.v1";
  const STAGES = ["lead", "kontakt", "oferta", "wygrany", "przegrany"];
  const STAGE_LABELS = {
    lead: "Lead",
    kontakt: "Kontakt",
    oferta: "Oferta",
    wygrany: "Wygrany",
    przegrany: "Przegrany",
  };

  /** @type {Array<Object>} */
  let contacts = [];
  let filterStage = "all";
  let searchText = "";
  let sortKey = "name";
  let sortDir = 1;

  // --- Trwałość danych ---------------------------------------------------
  function load() {
    try {
      contacts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      contacts = [];
    }
    if (contacts.length === 0) seed();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }

  function seed() {
    contacts = [
      { id: uid(), name: "Anna Kowalska", company: "Acme Sp. z o.o.", email: "anna@acme.pl", phone: "600 100 200", stage: "oferta", value: 12000, notes: "Zainteresowana pakietem Premium.", createdAt: Date.now() },
      { id: uid(), name: "Jan Nowak", company: "TechSoft", email: "jan.nowak@techsoft.pl", phone: "501 222 333", stage: "lead", value: 5000, notes: "", createdAt: Date.now() },
      { id: uid(), name: "Maria Wiśniewska", company: "Bistro Centrum", email: "kontakt@bistro.pl", phone: "", stage: "wygrany", value: 8000, notes: "Umowa podpisana.", createdAt: Date.now() },
    ];
    save();
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // --- Operacje na danych ------------------------------------------------
  function upsert(data) {
    if (data.id) {
      const i = contacts.findIndex((c) => c.id === data.id);
      if (i !== -1) contacts[i] = Object.assign({}, contacts[i], data);
    } else {
      data.id = uid();
      data.createdAt = Date.now();
      contacts.push(data);
    }
    save();
    render();
  }

  function remove(id) {
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    if (!confirm(`Usunąć kontakt "${c.name}"?`)) return;
    contacts = contacts.filter((x) => x.id !== id);
    save();
    render();
  }

  // --- Widok -------------------------------------------------------------
  function visibleContacts() {
    const q = searchText.trim().toLowerCase();
    return contacts
      .filter((c) => filterStage === "all" || c.stage === filterStage)
      .filter((c) => {
        if (!q) return true;
        return [c.name, c.company, c.email, c.phone].some(
          (v) => (v || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let av = a[sortKey] ?? "";
        let bv = b[sortKey] ?? "";
        if (sortKey === "value") {
          av = Number(av) || 0;
          bv = Number(bv) || 0;
        } else {
          av = String(av).toLowerCase();
          bv = String(bv).toLowerCase();
        }
        return av < bv ? -sortDir : av > bv ? sortDir : 0;
      });
  }

  function fmtMoney(v) {
    const n = Number(v) || 0;
    return n.toLocaleString("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 });
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[m]));
  }

  function renderStats() {
    const total = contacts.length;
    const won = contacts.filter((c) => c.stage === "wygrany");
    const openValue = contacts
      .filter((c) => c.stage !== "wygrany" && c.stage !== "przegrany")
      .reduce((s, c) => s + (Number(c.value) || 0), 0);
    const wonValue = won.reduce((s, c) => s + (Number(c.value) || 0), 0);

    const cards = [
      { label: "Wszystkie kontakty", value: total },
      { label: "Otwarte szanse", value: fmtMoney(openValue) },
      { label: "Wygrane", value: won.length },
      { label: "Przychód (wygrane)", value: fmtMoney(wonValue) },
    ];
    document.getElementById("stats").innerHTML = cards
      .map((c) => `<div class="stat-card"><div class="label">${c.label}</div><div class="value">${c.value}</div></div>`)
      .join("");
  }

  function renderFilters() {
    const wrap = document.getElementById("stageFilters");
    const all = [{ key: "all", label: "Wszystkie" }].concat(
      STAGES.map((s) => ({ key: s, label: STAGE_LABELS[s] }))
    );
    wrap.innerHTML = all
      .map((f) => `<button class="chip ${filterStage === f.key ? "active" : ""}" data-stage="${f.key}">${f.label}</button>`)
      .join("");
  }

  function renderTable() {
    const rows = visibleContacts();
    const body = document.getElementById("contactsBody");
    document.getElementById("count").textContent = `${rows.length} z ${contacts.length}`;
    document.getElementById("emptyState").hidden = rows.length !== 0;

    body.innerHTML = rows
      .map((c) => `
        <tr data-id="${c.id}">
          <td><strong>${esc(c.name)}</strong></td>
          <td>${esc(c.company)}</td>
          <td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}</td>
          <td>${esc(c.phone)}</td>
          <td><span class="badge ${c.stage}">${STAGE_LABELS[c.stage] || c.stage}</span></td>
          <td>${fmtMoney(c.value)}</td>
          <td class="col-actions">
            <button class="icon-btn" data-action="edit" title="Edytuj">✏️</button>
            <button class="icon-btn" data-action="delete" title="Usuń">🗑️</button>
          </td>
        </tr>`)
      .join("");
  }

  function render() {
    renderStats();
    renderFilters();
    renderTable();
  }

  // --- Modal -------------------------------------------------------------
  const modal = document.getElementById("modal");
  const form = document.getElementById("contactForm");

  function openModal(contact) {
    document.getElementById("modalTitle").textContent = contact ? "Edytuj kontakt" : "Nowy kontakt";
    document.getElementById("contactId").value = contact?.id || "";
    document.getElementById("f-name").value = contact?.name || "";
    document.getElementById("f-company").value = contact?.company || "";
    document.getElementById("f-email").value = contact?.email || "";
    document.getElementById("f-phone").value = contact?.phone || "";
    document.getElementById("f-stage").value = contact?.stage || "lead";
    document.getElementById("f-value").value = contact?.value ?? "";
    document.getElementById("f-notes").value = contact?.notes || "";
    modal.hidden = false;
    document.getElementById("f-name").focus();
  }

  function closeModal() {
    modal.hidden = true;
    form.reset();
  }

  // --- Import / Export ---------------------------------------------------
  function exportData() {
    const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-eksport-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("Nieprawidłowy format");
        contacts = data.map((c) => Object.assign({ id: uid(), stage: "lead" }, c));
        save();
        render();
        alert(`Zaimportowano ${contacts.length} kontaktów.`);
      } catch (e) {
        alert("Błąd importu: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  // --- Zdarzenia ---------------------------------------------------------
  function bind() {
    document.getElementById("addBtn").addEventListener("click", () => openModal(null));
    document.getElementById("cancelBtn").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      upsert({
        id: document.getElementById("contactId").value || undefined,
        name: document.getElementById("f-name").value.trim(),
        company: document.getElementById("f-company").value.trim(),
        email: document.getElementById("f-email").value.trim(),
        phone: document.getElementById("f-phone").value.trim(),
        stage: document.getElementById("f-stage").value,
        value: parseFloat(document.getElementById("f-value").value) || 0,
        notes: document.getElementById("f-notes").value.trim(),
      });
      closeModal();
    });

    document.getElementById("search").addEventListener("input", (e) => {
      searchText = e.target.value;
      renderTable();
    });

    document.getElementById("stageFilters").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-stage]");
      if (!btn) return;
      filterStage = btn.dataset.stage;
      render();
    });

    document.getElementById("contactsBody").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.closest("tr").dataset.id;
      if (btn.dataset.action === "edit") openModal(contacts.find((c) => c.id === id));
      else if (btn.dataset.action === "delete") remove(id);
    });

    document.querySelectorAll(".contacts th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (sortKey === key) sortDir *= -1;
        else { sortKey = key; sortDir = 1; }
        renderTable();
      });
    });

    document.getElementById("exportBtn").addEventListener("click", exportData);
    document.getElementById("importInput").addEventListener("change", (e) => {
      if (e.target.files[0]) importData(e.target.files[0]);
      e.target.value = "";
    });
  }

  // --- Start -------------------------------------------------------------
  load();
  bind();
  render();
})();
