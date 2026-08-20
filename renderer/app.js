'use strict';

/* global Numbering */

// ============================== Stan aplikacji ==============================

const DEFAULT_STATE = {
  settings: {
    seller: {
      name: 'ZPHU Lechrol Jacek Wajcht',
      address: 'ul. Leśna 6, 05-092 Łomianki',
      nip: '',
      phone: '511 697 697',
      www: 'lechrol.pl'
    },
    place: 'Łomianki',
    smtp: { host: '', port: 587, user: '', pass: '', from: '' },
    emailSubject: 'Dokument WZ {numer} — Lechrol',
    emailBody: 'Dzień dobry,\n\nw załączniku przesyłamy dokument WZ {numer} (wydanie zewnętrzne).\n\nPozdrawiamy,\nZPHU Lechrol Jacek Wajcht\ntel. 511 697 697 · lechrol.pl'
  },
  contractors: [],
  documents: []
};

let state = null;
let editingDocId = null;      // null = nowy dokument
let editingContractorId = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const hasApi = typeof window.wzApi !== 'undefined';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function deepMerge(base, extra) {
  if (extra === null || extra === undefined) return structuredClone(base);
  if (Array.isArray(base) || typeof base !== 'object') return extra;
  const out = {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(extra)])) {
    out[key] = key in base ? deepMerge(base[key], extra[key]) : extra[key];
  }
  return out;
}

async function loadState() {
  let saved = null;
  if (hasApi) {
    saved = await window.wzApi.loadData();
  } else {
    try { saved = JSON.parse(localStorage.getItem('lechrol-wz-data')); } catch { saved = null; }
  }
  state = deepMerge(DEFAULT_STATE, saved);
}

async function persist() {
  if (hasApi) {
    await window.wzApi.saveData(state);
  } else {
    localStorage.setItem('lechrol-wz-data', JSON.stringify(state));
  }
}

// ============================== Pomocnicze ==============================

const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;

let toastTimer = null;
function toast(msg, isError) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('error', !!isError);
  el.classList.add('hidden');
  void el.offsetWidth; // restart animacji wejścia
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), isError ? 6000 : 3000);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDatePl(dateStr) {
  const [y, m, d] = String(dateStr || '').split('-');
  return (y && m && d) ? `${d}.${m}.${y}` : '';
}

function docById(id) {
  return state.documents.find((d) => d.id === id) || null;
}

// ============================== Nawigacja ==============================

function showView(name) {
  $$('.view').forEach((v) => v.classList.add('hidden'));
  $('#view-' + name).classList.remove('hidden');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'list') renderDocsList();
  if (name === 'contractors') renderContractors();
  if (name === 'settings') renderSettings();
}

// ============================== Lista dokumentów ==============================

function renderDocsList() {
  const q = $('#searchDocs').value.trim().toLowerCase();
  const tbody = $('#docsTable tbody');
  const docs = state.documents
    .slice()
    .sort((a, b) => (b.dateIssued + b.number).localeCompare(a.dateIssued + a.number))
    .filter((d) => {
      if (!q) return true;
      return [d.number, d.contractor?.name, d.orderNo, d.dateIssued, formatDatePl(d.dateIssued)]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });

  tbody.innerHTML = docs.map((d) => `
    <tr data-id="${d.id}">
      <td class="doc-number-cell">${esc(d.number)}</td>
      <td class="num">${esc(formatDatePl(d.dateIssued))}</td>
      <td>${esc(d.contractor?.name || '—')}</td>
      <td>${esc(d.orderNo || '')}</td>
      <td class="td-num">${d.items.filter((i) => i.name).length}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-small btn-light" data-act="edit">${icon('edit')}Edytuj</button>
          <button class="btn btn-small btn-light" data-act="print" aria-label="Drukuj" title="Drukuj">${icon('print')}</button>
          <button class="btn btn-small btn-light" data-act="pdf" aria-label="Zapisz PDF" title="Zapisz PDF">${icon('pdf')}</button>
          <button class="btn btn-small btn-light" data-act="email" aria-label="Wyślij e-mailem" title="Wyślij e-mailem">${icon('mail')}</button>
          <button class="btn btn-small btn-danger" data-act="delete" aria-label="Usuń" title="Usuń">${icon('trash')}</button>
        </div>
      </td>
    </tr>`).join('')
    || (state.documents.length
      ? `<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Brak wyników dla „${esc(q)}”.</td></tr>`
      : '');

  const anyDocs = state.documents.length > 0;
  $('#docsTable').classList.toggle('hidden', !anyDocs);
  $('#docsEmpty').classList.toggle('hidden', anyDocs);
  $('#docsCount').textContent = docs.length ? `Dokumentów: ${docs.length}` : '';
}

async function handleDocAction(id, act) {
  const doc = docById(id);
  if (!doc) return;
  if (act === 'edit') return openEditor(id);
  if (act === 'print') return printDoc(doc);
  if (act === 'pdf') return savePdf(doc);
  if (act === 'email') return emailDoc(doc);
  if (act === 'delete') {
    if (!confirm(`Usunąć dokument ${doc.number}? Tej operacji nie można cofnąć.`)) return;
    state.documents = state.documents.filter((d) => d.id !== id);
    await persist();
    renderDocsList();
    toast(`Usunięto dokument ${doc.number}.`);
  }
}

// ============================== Edytor WZ ==============================

function openEditor(id) {
  editingDocId = id || null;
  const doc = id ? docById(id) : null;

  $('#editTitle').textContent = doc ? `Edycja WZ ${doc.number}` : 'Nowa WZ';
  $('#btnDeleteDoc').classList.toggle('hidden', !doc);

  $('#fDate').value = doc ? doc.dateIssued : todayStr();
  $('#fPlace').value = doc ? doc.place : state.settings.place;
  $('#fOrderNo').value = doc ? (doc.orderNo || '') : '';
  $('#fCName').value = doc ? (doc.contractor?.name || '') : '';
  $('#fCAddress').value = doc ? (doc.contractor?.address || '') : '';
  $('#fCNip').value = doc ? (doc.contractor?.nip || '') : '';
  $('#fCEmail').value = doc ? (doc.contractor?.email || '') : '';
  $('#fNotes').value = doc ? (doc.notes || '') : '';
  $('#fSaveContractor').checked = false;

  fillContractorSelect(doc?.contractorId || '');
  renderItemRows(doc ? doc.items : [{ name: '', unit: 'szt.', qty: '' }]);
  updateNumberPreview();
  showView('edit');
}

function fillContractorSelect(selectedId) {
  const sel = $('#fContractorSelect');
  const options = state.contractors
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
    .join('');
  sel.innerHTML = '<option value="">— wpisz ręcznie lub wybierz —</option>' + options;
  sel.value = selectedId || '';
}

function renderItemRows(items) {
  const tbody = $('#itemsBody');
  tbody.innerHTML = '';
  (items.length ? items : [{ name: '', unit: 'szt.', qty: '' }]).forEach((it) => addItemRow(it));
}

function addItemRow(item) {
  const tbody = $('#itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="item-lp"></td>
    <td><input type="text" class="input item-name" value="${esc(item?.name || '')}" aria-label="Nazwa towaru"></td>
    <td><input type="text" class="input item-unit" value="${esc(item?.unit ?? 'szt.')}" aria-label="Jednostka"></td>
    <td><input type="text" class="input item-qty" value="${esc(item?.qty || '')}" aria-label="Ilość"></td>
    <td><button class="btn btn-small btn-danger item-remove" aria-label="Usuń pozycję" title="Usuń pozycję">${icon('x')}</button></td>`;
  tbody.appendChild(tr);
  renumberItems();
}

function renumberItems() {
  $$('#itemsBody tr').forEach((tr, i) => { tr.querySelector('.item-lp').textContent = i + 1; });
}

function collectItems() {
  return $$('#itemsBody tr').map((tr) => ({
    name: tr.querySelector('.item-name').value.trim(),
    unit: tr.querySelector('.item-unit').value.trim(),
    qty: tr.querySelector('.item-qty').value.trim()
  })).filter((it) => it.name || it.qty);
}

// Podgląd numeru: dla nowego dokumentu i przy zmianie miesiąca numer jest wyliczany na nowo;
// edytowany dokument w tym samym miesiącu zachowuje swój numer kolejny.
function computeNumberFor(dateStr, contractorName) {
  const existing = editingDocId ? docById(editingDocId) : null;
  let seq;
  if (existing) {
    const oldD = Numbering.parseDate(existing.dateIssued);
    const newD = Numbering.parseDate(dateStr);
    seq = (oldD.year === newD.year && oldD.month === newD.month)
      ? existing.seq
      : Numbering.nextSeq(state.documents, dateStr, editingDocId);
  } else {
    seq = Numbering.nextSeq(state.documents, dateStr);
  }
  return { seq, number: Numbering.buildNumber(dateStr, seq, contractorName) };
}

function updateNumberPreview() {
  const dateStr = $('#fDate').value || todayStr();
  const name = $('#fCName').value.trim();
  $('#numberPreview').textContent = computeNumberFor(dateStr, name).number;
}

async function saveDoc() {
  const dateStr = $('#fDate').value;
  const name = $('#fCName').value.trim();
  if (!dateStr) { toast('Podaj datę wystawienia.', true); return null; }
  if (!name) { toast('Podaj nazwę odbiorcy.', true); return null; }

  const { seq, number } = computeNumberFor(dateStr, name);
  const contractor = {
    name,
    address: $('#fCAddress').value.trim(),
    nip: $('#fCNip').value.trim(),
    email: $('#fCEmail').value.trim()
  };

  let contractorId = $('#fContractorSelect').value || null;
  if ($('#fSaveContractor').checked) {
    contractorId = upsertContractor(contractorId, contractor);
  }

  const doc = {
    id: editingDocId || uid(),
    number,
    seq,
    dateIssued: dateStr,
    place: $('#fPlace').value.trim(),
    orderNo: $('#fOrderNo').value.trim(),
    contractorId,
    contractor,
    items: collectItems(),
    notes: $('#fNotes').value.trim(),
    updatedAt: new Date().toISOString()
  };

  if (editingDocId) {
    const idx = state.documents.findIndex((d) => d.id === editingDocId);
    doc.createdAt = state.documents[idx]?.createdAt || doc.updatedAt;
    state.documents[idx] = doc;
  } else {
    doc.createdAt = doc.updatedAt;
    state.documents.push(doc);
    editingDocId = doc.id;
  }

  await persist();
  $('#editTitle').textContent = `Edycja WZ ${doc.number}`;
  $('#btnDeleteDoc').classList.remove('hidden');
  $('#numberPreview').textContent = doc.number;
  return doc;
}

function upsertContractor(id, data) {
  const existing = id ? state.contractors.find((c) => c.id === id) : null;
  if (existing) {
    Object.assign(existing, data);
    return existing.id;
  }
  const created = { id: uid(), ...data };
  state.contractors.push(created);
  return created.id;
}

// ============================== Wydruk / PDF / e-mail ==============================

const MIN_PRINT_ROWS = 12;

function fillPrintArea(doc) {
  const s = state.settings.seller;
  const items = doc.items.slice();
  while (items.length < MIN_PRINT_ROWS) items.push({ name: '', unit: '', qty: '' });

  const rows = items.map((it, i) => `
    <tr>
      <td class="col-lp">${i + 1}</td>
      <td>${esc(it.name)}</td>
      <td class="col-unit">${esc(it.unit)}</td>
      <td class="col-qty">${esc(it.qty)}</td>
    </tr>`).join('');

  $('#print-area').innerHTML = `
  <div class="wz-doc">
    <div class="wz-header">
      <div>
        <div class="wz-logo-name">LECHROL</div>
        <div class="wz-logo-sub">POLSKI PRODUCENT</div>
        <div class="wz-seller-lines">
          ${esc(s.name)}<br>
          ${esc(s.address)}<br>
          tel. ${esc(s.phone)}<br>
          ${esc(s.www)}
        </div>
      </div>
      <div class="wz-title-block">
        <div class="wz-title">WZ — Wydanie zewnętrzne</div>
        <div class="wz-number">Nr ${esc(doc.number)}</div>
        <div class="wz-subtitle">Dokument wydania towaru z magazynu</div>
      </div>
    </div>

    <div class="wz-meta">
      <div class="wz-meta-cell">
        <div class="wz-label">Data wystawienia</div>
        <div class="wz-meta-value">${esc(formatDatePl(doc.dateIssued))}</div>
      </div>
      <div class="wz-meta-cell">
        <div class="wz-label">Miejsce wystawienia</div>
        <div class="wz-meta-value">${esc(doc.place)}</div>
      </div>
      <div class="wz-meta-cell">
        <div class="wz-label">Nr zamówienia / umowy</div>
        <div class="wz-meta-value">${esc(doc.orderNo)}</div>
      </div>
    </div>

    <div class="wz-parties">
      <div class="wz-party">
        <div class="wz-label">Sprzedawca / Wydający</div>
        <div class="wz-party-row"><div class="wz-party-key">Firma:</div><div class="wz-party-val">${esc(s.name)}</div></div>
        <div class="wz-party-row"><div class="wz-party-key">Adres:</div><div class="wz-party-val">${esc(s.address)}</div></div>
        <div class="wz-party-row"><div class="wz-party-key">NIP:</div><div class="wz-party-val">${esc(s.nip)}</div></div>
      </div>
      <div class="wz-party">
        <div class="wz-label">Odbiorca / Nabywca</div>
        <div class="wz-party-row"><div class="wz-party-key">Firma / Imię:</div><div class="wz-party-val">${esc(doc.contractor?.name)}</div></div>
        <div class="wz-party-row"><div class="wz-party-key">Adres:</div><div class="wz-party-val">${esc(doc.contractor?.address)}</div></div>
        <div class="wz-party-row"><div class="wz-party-key">NIP:</div><div class="wz-party-val">${esc(doc.contractor?.nip)}</div></div>
      </div>
    </div>

    <table class="wz-items">
      <thead>
        <tr>
          <th class="col-lp">Lp.</th>
          <th>Nazwa towaru / opis</th>
          <th class="col-unit">Jedn.</th>
          <th class="col-qty">Ilość</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="wz-notes">
      <div class="wz-label">Uwagi</div>
      <div class="wz-notes-text">${esc(doc.notes)}</div>
    </div>

    <div class="wz-signatures">
      <div class="wz-sign">Wystawił / Wydał (podpis)</div>
      <div class="wz-sign">Odebrał (podpis)</div>
    </div>

    <div class="wz-footer">
      ${esc(s.name)} · ${esc(s.address)} · tel. ${esc(s.phone)} · ${esc(s.www)}
    </div>
  </div>`;
}

function pdfFilename(doc) {
  return 'WZ_' + doc.number.replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
}

async function printDoc(doc) {
  fillPrintArea(doc);
  if (hasApi) {
    const res = await window.wzApi.printDoc();
    if (!res.ok && res.error && res.error !== 'cancelled') toast('Drukowanie: ' + res.error, true);
  } else {
    window.print();
  }
}

async function savePdf(doc) {
  fillPrintArea(doc);
  if (hasApi) {
    const res = await window.wzApi.savePdf(pdfFilename(doc));
    if (res.ok) toast('Zapisano PDF: ' + res.filePath);
    else if (!res.canceled) toast('Błąd zapisu PDF: ' + res.error, true);
  } else {
    window.print();
  }
}

async function emailDoc(doc) {
  if (!hasApi) { toast('Wysyłka e-mail dostępna tylko w aplikacji desktopowej.', true); return; }
  const to = doc.contractor?.email;
  if (!to) { toast('Odbiorca nie ma podanego adresu e-mail. Uzupełnij go w dokumencie.', true); return; }
  const smtp = state.settings.smtp;
  if (!smtp.host || !smtp.user) { toast('Brak konfiguracji poczty — uzupełnij dane SMTP w Ustawieniach.', true); return; }
  if (!confirm(`Wysłać dokument ${doc.number} na adres ${to}?`)) return;

  fillPrintArea(doc);
  toast('Wysyłanie e-maila…');
  const res = await window.wzApi.sendEmail({
    smtp,
    to,
    subject: state.settings.emailSubject.replaceAll('{numer}', doc.number),
    text: state.settings.emailBody.replaceAll('{numer}', doc.number),
    filename: pdfFilename(doc)
  });
  if (res.ok) toast(`Wysłano dokument ${doc.number} na adres ${to}.`);
  else toast('Błąd wysyłki: ' + res.error, true);
}

// ============================== Kontrahenci ==============================

function renderContractors() {
  const q = $('#searchContractors').value.trim().toLowerCase();
  const list = state.contractors
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    .filter((c) => !q || [c.name, c.nip, c.address, c.email].some((v) => String(v || '').toLowerCase().includes(q)));

  $('#contractorsBody').innerHTML = list.map((c) => `
    <tr data-id="${c.id}">
      <td>${esc(c.name)}</td>
      <td class="num">${esc(c.nip)}</td>
      <td>${esc(c.address)}</td>
      <td>${esc(c.email)}</td>
      <td>${esc(Numbering.contractorCode(c.name))}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-small btn-light" data-act="edit">${icon('edit')}Edytuj</button>
          <button class="btn btn-small btn-danger" data-act="delete" aria-label="Usuń" title="Usuń">${icon('trash')}</button>
        </div>
      </td>
    </tr>`).join('')
    || (state.contractors.length
      ? `<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Brak wyników dla „${esc(q)}”.</td></tr>`
      : '');

  const anyContractors = state.contractors.length > 0;
  $('#contractorsBody').closest('table').classList.toggle('hidden', !anyContractors);
  $('#contractorsEmpty').classList.toggle('hidden', anyContractors);
}

function openContractorForm(id) {
  editingContractorId = id || null;
  const c = id ? state.contractors.find((x) => x.id === id) : null;
  $('#contractorFormTitle').textContent = c ? `Edycja: ${c.name}` : 'Nowy kontrahent';
  $('#cfName').value = c?.name || '';
  $('#cfNip').value = c?.nip || '';
  $('#cfAddress').value = c?.address || '';
  $('#cfEmail').value = c?.email || '';
  $('#contractorForm').classList.remove('hidden');
  $('#cfName').focus();
}

async function saveContractorForm() {
  const name = $('#cfName').value.trim();
  if (!name) { toast('Podaj nazwę kontrahenta.', true); return; }
  upsertContractor(editingContractorId, {
    name,
    nip: $('#cfNip').value.trim(),
    address: $('#cfAddress').value.trim(),
    email: $('#cfEmail').value.trim()
  });
  await persist();
  $('#contractorForm').classList.add('hidden');
  renderContractors();
  toast('Zapisano kontrahenta.');
}

// ============================== Ustawienia ==============================

function renderSettings() {
  const st = state.settings;
  $('#sName').value = st.seller.name;
  $('#sNip').value = st.seller.nip;
  $('#sAddress').value = st.seller.address;
  $('#sPhone').value = st.seller.phone;
  $('#sWww').value = st.seller.www;
  $('#sPlace').value = st.place;
  $('#mHost').value = st.smtp.host;
  $('#mPort').value = st.smtp.port || '';
  $('#mUser').value = st.smtp.user;
  $('#mPass').value = st.smtp.pass;
  $('#mFrom').value = st.smtp.from;
  $('#mSubject').value = st.emailSubject;
  $('#mBody').value = st.emailBody;
}

async function saveSettings() {
  const st = state.settings;
  st.seller.name = $('#sName').value.trim();
  st.seller.nip = $('#sNip').value.trim();
  st.seller.address = $('#sAddress').value.trim();
  st.seller.phone = $('#sPhone').value.trim();
  st.seller.www = $('#sWww').value.trim();
  st.place = $('#sPlace').value.trim();
  st.smtp = {
    host: $('#mHost').value.trim(),
    port: Number($('#mPort').value) || 587,
    user: $('#mUser').value.trim(),
    pass: $('#mPass').value,
    from: $('#mFrom').value.trim()
  };
  st.emailSubject = $('#mSubject').value;
  st.emailBody = $('#mBody').value;
  await persist();
  toast('Zapisano ustawienia.');
}

// ============================== Zdarzenia ==============================

function bindEvents() {
  $$('.nav-btn').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
  $('#btnNewDoc').addEventListener('click', () => openEditor(null));
  $('#btnEmptyNewDoc').addEventListener('click', () => openEditor(null));
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'n') {
      ev.preventDefault();
      openEditor(null);
    }
  });

  // Lista dokumentów
  $('#searchDocs').addEventListener('input', renderDocsList);
  $('#docsTable tbody').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    handleDocAction(btn.closest('tr').dataset.id, btn.dataset.act);
  });

  // Edytor
  $('#fDate').addEventListener('change', updateNumberPreview);
  $('#fCName').addEventListener('input', updateNumberPreview);
  $('#fContractorSelect').addEventListener('change', () => {
    const c = state.contractors.find((x) => x.id === $('#fContractorSelect').value);
    if (c) {
      $('#fCName').value = c.name;
      $('#fCAddress').value = c.address || '';
      $('#fCNip').value = c.nip || '';
      $('#fCEmail').value = c.email || '';
      updateNumberPreview();
    }
  });
  $('#btnAddItem').addEventListener('click', () => addItemRow());
  $('#itemsBody').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.item-remove');
    if (!btn) return;
    btn.closest('tr').remove();
    if (!$('#itemsBody').children.length) addItemRow();
    renumberItems();
  });
  // Enter w ostatnim wierszu dodaje nową pozycję
  $('#itemsBody').addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const tr = ev.target.closest('tr');
    if (tr && tr === $('#itemsBody').lastElementChild) {
      ev.preventDefault();
      addItemRow();
      $('#itemsBody').lastElementChild.querySelector('.item-name').focus();
    }
  });

  $('#btnSaveDoc').addEventListener('click', async () => {
    const doc = await saveDoc();
    if (doc) toast(`Zapisano dokument ${doc.number}.`);
  });
  $('#btnSavePrint').addEventListener('click', async () => {
    const doc = await saveDoc();
    if (doc) printDoc(doc);
  });
  $('#btnSavePdf').addEventListener('click', async () => {
    const doc = await saveDoc();
    if (doc) savePdf(doc);
  });
  $('#btnSaveEmail').addEventListener('click', async () => {
    const doc = await saveDoc();
    if (doc) emailDoc(doc);
  });
  $('#btnDeleteDoc').addEventListener('click', async () => {
    const doc = editingDocId ? docById(editingDocId) : null;
    if (!doc) return;
    if (!confirm(`Usunąć dokument ${doc.number}? Tej operacji nie można cofnąć.`)) return;
    state.documents = state.documents.filter((d) => d.id !== doc.id);
    await persist();
    showView('list');
    toast(`Usunięto dokument ${doc.number}.`);
  });
  $('#btnBack').addEventListener('click', () => showView('list'));

  // Kontrahenci
  $('#searchContractors').addEventListener('input', renderContractors);
  $('#btnNewContractor').addEventListener('click', () => openContractorForm(null));
  $('#contractorsBody').addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    if (btn.dataset.act === 'edit') openContractorForm(id);
    if (btn.dataset.act === 'delete') {
      const c = state.contractors.find((x) => x.id === id);
      if (!confirm(`Usunąć kontrahenta „${c?.name}” z bazy? Wystawione dokumenty pozostaną bez zmian.`)) return;
      state.contractors = state.contractors.filter((x) => x.id !== id);
      await persist();
      renderContractors();
    }
  });
  $('#btnSaveContractor').addEventListener('click', saveContractorForm);
  $('#btnCancelContractor').addEventListener('click', () => $('#contractorForm').classList.add('hidden'));

  // Ustawienia
  $('#btnSaveSettings').addEventListener('click', saveSettings);
}

// ============================== Start ==============================

(async function init() {
  await loadState();
  bindEvents();
  if (hasApi) {
    const loc = await window.wzApi.dataLocation();
    $('#dataLocation').textContent = 'Dane zapisywane w pliku: ' + loc;
  }
  showView('list');
})();
